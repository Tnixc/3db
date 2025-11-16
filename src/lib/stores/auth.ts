import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

const GITHUB_TOKEN_KEY = '3db_github_token';
const GITHUB_USER_KEY = '3db_github_user';

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
	| { status: 'ready'; token: string; user: GitHubUser; hasGithubApp: boolean }
	| { status: 'error'; error: string; token: string; user: GitHubUser };

function createAuthStore() {
	// Initialize from localStorage
	const initialToken = browser ? localStorage.getItem(GITHUB_TOKEN_KEY) : null;
	const initialUser = browser ? JSON.parse(localStorage.getItem(GITHUB_USER_KEY) || 'null') : null;

	const initialState: AuthState = initialToken && initialUser
		? { status: 'logged_in', token: initialToken, user: initialUser }
		: { status: 'logged_out' };

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
				}

				set({ status: 'logged_in', token, user });
			} catch (error) {
				set({ status: 'logged_out' });
				throw error;
			}
		},

		logout() {
			if (browser) {
				localStorage.removeItem(GITHUB_TOKEN_KEY);
				localStorage.removeItem(GITHUB_USER_KEY);
			}
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

		setReady(hasGithubApp: boolean) {
			update(state => {
				if (state.status === 'initializing' || state.status === 'logged_in') {
					return { ...state, status: 'ready', hasGithubApp };
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
