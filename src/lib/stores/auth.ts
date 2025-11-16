import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const GITHUB_TOKEN_KEY = '3db_github_token';
const GITHUB_USER_KEY = '3db_github_user';

export interface GitHubUser {
	login: string;
	name: string;
	email: string;
	avatar_url: string;
}

export type AppState =
	| { status: 'unauthenticated' }
	| { status: 'logging_in' }
	| { status: 'initializing'; token: string; user: GitHubUser }
	| { status: 'ready'; token: string; user: GitHubUser; hasGithubApp: boolean }
	| { status: 'error'; error: string };

function createAuthStore() {
	// Initialize from localStorage if available
	const initialToken = browser ? localStorage.getItem(GITHUB_TOKEN_KEY) : null;
	const initialUser = browser
		? JSON.parse(localStorage.getItem(GITHUB_USER_KEY) || 'null')
		: null;

	const initialState: AppState =
		initialToken && initialUser
			? { status: 'initializing', token: initialToken, user: initialUser }
			: { status: 'unauthenticated' };

	const { subscribe, set } = writable<AppState>(initialState);

	return {
		subscribe,

		// Login with token
		login: async (token: string) => {
			set({ status: 'logging_in' });

			try {
				// Fetch user info from GitHub
				const response = await fetch('https://api.github.com/user', {
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: 'application/vnd.github.v3+json'
					}
				});

				if (!response.ok) {
					throw new Error('Invalid token or unable to fetch user information');
				}

				const data = await response.json();
				const user: GitHubUser = {
					login: data.login,
					name: data.name || data.login,
					email: data.email || `${data.login}@users.noreply.github.com`,
					avatar_url: data.avatar_url
				};

				// Store in localStorage
				if (browser) {
					localStorage.setItem(GITHUB_TOKEN_KEY, token);
					localStorage.setItem(GITHUB_USER_KEY, JSON.stringify(user));
				}

				// Move to initializing state
				set({ status: 'initializing', token, user });
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : 'Login failed';
				set({ status: 'error', error: errorMsg });
			}
		},

		// Mark initialization as complete
		markReady: (hasGithubApp: boolean, token: string, user: GitHubUser) => {
			set({ status: 'ready', token, user, hasGithubApp });
		},

		// Set error state
		setError: (error: string) => {
			set({ status: 'error', error });
		},

		// Logout
		logout: () => {
			if (browser) {
				localStorage.removeItem(GITHUB_TOKEN_KEY);
				localStorage.removeItem(GITHUB_USER_KEY);
			}
			set({ status: 'unauthenticated' });
		}
	};
}

export const appState = createAuthStore();
