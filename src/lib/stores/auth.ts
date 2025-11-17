import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * SECURITY WARNING: Storing tokens in localStorage is insecure
 * - Vulnerable to XSS attacks
 * - Accessible by browser extensions
 * - No automatic expiration
 *
 * TODO: Migrate to httpOnly cookies with server-side session management
 * See SECURITY_AUDIT.md for details
 */

const GITHUB_TOKEN_KEY = '3db_github_token';
const GITHUB_USER_KEY = '3db_github_user';
const TOKEN_TIMESTAMP_KEY = '3db_token_timestamp';

// Token expiration: 30 days (reasonable for PATs)
const TOKEN_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000;

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
 * Check if a stored token has expired
 */
function isTokenExpired(): boolean {
	if (!browser) return false;

	const timestamp = localStorage.getItem(TOKEN_TIMESTAMP_KEY);
	if (!timestamp) return true; // No timestamp = expired

	const tokenAge = Date.now() - parseInt(timestamp, 10);
	return tokenAge > TOKEN_EXPIRATION_MS;
}

/**
 * Clear all stored authentication data
 */
function clearStoredAuth() {
	if (!browser) return;

	localStorage.removeItem(GITHUB_TOKEN_KEY);
	localStorage.removeItem(GITHUB_USER_KEY);
	localStorage.removeItem(TOKEN_TIMESTAMP_KEY);
}

function createAuthStore() {
	// Initialize from localStorage
	const initialToken = browser ? localStorage.getItem(GITHUB_TOKEN_KEY) : null;
	const initialUser = browser ? JSON.parse(localStorage.getItem(GITHUB_USER_KEY) || 'null') : null;

	// Check token expiration
	let initialState: AuthState;
	if (initialToken && initialUser) {
		if (isTokenExpired()) {
			console.warn('Stored token has expired, clearing authentication');
			clearStoredAuth();
			initialState = { status: 'logged_out' };
		} else {
			initialState = { status: 'logged_in', token: initialToken, user: initialUser };
		}
	} else {
		initialState = { status: 'logged_out' };
	}

	const { subscribe, set, update } = writable<AuthState>(initialState);

	return {
		subscribe,

		async login(token: string) {
			set({ status: 'logging_in' });

			try {
				const user = await fetchGitHubUser(token);

				if (browser) {
					localStorage.setItem(GITHUB_TOKEN_KEY, token);
					localStorage.setItem(GITHUB_USER_KEY, JSON.stringify(user));
					localStorage.setItem(TOKEN_TIMESTAMP_KEY, Date.now().toString());
				}

				set({ status: 'logged_in', token, user });
			} catch (error) {
				set({ status: 'logged_out' });
				throw error;
			}
		},

		logout() {
			clearStoredAuth();
			set({ status: 'logged_out' });
		},

		setInitializing() {
			update(state => {
				if (state.status === 'logged_in') {
					return { ...state, status: 'initializing' };
				}
				return state;
			});
		},

		setReady() {
			update(state => {
				if (state.status === 'initializing' || state.status === 'logged_in') {
					return { ...state, status: 'ready' };
				}
				return state;
			});
		},

		setError(error: string) {
			update(state => {
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
export const user = derived(authStore, $auth =>
	$auth.status !== 'logged_out' && $auth.status !== 'logging_in' ? $auth.user : null
);

export const token = derived(authStore, $auth =>
	$auth.status !== 'logged_out' && $auth.status !== 'logging_in' ? $auth.token : null
);

export const isLoggedIn = derived(authStore, $auth =>
	$auth.status !== 'logged_out' && $auth.status !== 'logging_in'
);

export const isReady = derived(authStore, $auth =>
	$auth.status === 'ready'
);

// Helper function to fetch GitHub user info
async function fetchGitHubUser(token: string): Promise<GitHubUser> {
	const response = await fetch('https://api.github.com/user', {
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github.v3+json'
		}
	});

	if (!response.ok) {
		throw new Error('Failed to fetch GitHub user information');
	}

	const data = await response.json();
	return {
		login: data.login,
		name: data.name || data.login,
		email: data.email || `${data.login}@users.noreply.github.com`,
		avatar_url: data.avatar_url
	};
}
