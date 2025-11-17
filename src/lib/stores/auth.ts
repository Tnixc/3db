import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * OAuth-based authentication using secure httpOnly cookies
 * - Token stored in httpOnly cookie (not accessible by JavaScript)
 * - Protected from XSS attacks and browser extensions
 * - Automatic expiration handled by cookie
 */

export interface GitHubUser {
	login: string;
	name: string;
	email: string;
	avatar_url: string;
}

export type AuthState =
	| { status: 'logged_out' }
	| { status: 'logging_in' }
	| { status: 'logged_in'; token: string; user: GitHubUser }
	| { status: 'initializing'; token: string; user: GitHubUser }
	| { status: 'ready'; token: string; user: GitHubUser }
	| { status: 'error'; error: string; token: string; user: GitHubUser };

/**
 * Read user from cookie (user info is in a readable cookie for UI)
 */
function getUserFromCookie(): GitHubUser | null {
	if (!browser) return null;

	const cookies = document.cookie.split('; ');
	const userCookie = cookies.find((c) => c.startsWith('github_user='));

	if (userCookie) {
		try {
			const encoded = userCookie.split('=')[1];
			return JSON.parse(decodeURIComponent(encoded));
		} catch {
			return null;
		}
	}

	return null;
}

/**
 * Check if user has a token cookie (httpOnly, not directly accessible)
 */
function hasTokenCookie(): boolean {
	if (!browser) return false;

	// We can't read the httpOnly cookie directly, but if user cookie exists,
	// the token cookie should exist too (both set together)
	return getUserFromCookie() !== null;
}

function createAuthStore() {
	// Initialize from cookie
	const initialUser = browser ? getUserFromCookie() : null;

	// Note: token is not accessible from client (httpOnly cookie)
	// We use a placeholder 'cookie' string to indicate token is in httpOnly cookie
	const initialState: AuthState = initialUser && hasTokenCookie()
		? { status: 'logged_in', token: 'cookie', user: initialUser }
		: { status: 'logged_out' };

	const { subscribe, set, update } = writable<AuthState>(initialState);

	return {
		subscribe,

		/**
		 * Login redirects to OAuth flow
		 * Token will be set in httpOnly cookie by server
		 */
		login() {
			if (browser) {
				window.location.href = '/auth/login';
			}
		},

		/**
		 * Logout calls server endpoint to clear httpOnly cookie
		 */
		async logout() {
			try {
				await fetch('/auth/logout', {
					method: 'POST',
					credentials: 'same-origin'
				});
				set({ status: 'logged_out' });
			} catch (error) {
				console.error('Logout failed:', error);
			}
		},

		setInitializing() {
			update((state) => {
				if (state.status === 'logged_in') {
					return { ...state, status: 'initializing' };
				}
				return state;
			});
		},

		setReady() {
			update((state) => {
				if (state.status === 'initializing' || state.status === 'logged_in') {
					return { ...state, status: 'ready' };
				}
				return state;
			});
		},

		setError(error: string) {
			update((state) => {
				if (state.status !== 'logged_out' && state.status !== 'logging_in') {
					return { ...state, status: 'error', error };
				}
				return state;
			});
		}
	};
}

export const authStore = createAuthStore();

// Derived stores for convenience
export const user = derived(authStore, ($auth) =>
	$auth.status !== 'logged_out' && $auth.status !== 'logging_in' ? $auth.user : null
);

export const token = derived(authStore, ($auth) =>
	$auth.status !== 'logged_out' && $auth.status !== 'logging_in' ? $auth.token : null
);

export const isLoggedIn = derived(authStore, ($auth) =>
	$auth.status !== 'logged_out' && $auth.status !== 'logging_in'
);

export const isReady = derived(authStore, ($auth) => $auth.status === 'ready');
