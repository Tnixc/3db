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

function createAuthStore() {
	const { subscribe, set, update } = writable<{
		token: string | null;
		user: GitHubUser | null;
	}>({
		token: browser ? localStorage.getItem(GITHUB_TOKEN_KEY) : null,
		user: browser ? JSON.parse(localStorage.getItem(GITHUB_USER_KEY) || 'null') : null
	});

	return {
		subscribe,
		setToken: (token: string) => {
			if (browser) {
				localStorage.setItem(GITHUB_TOKEN_KEY, token);
			}
			update((state) => ({ ...state, token }));
		},
		setUser: (user: GitHubUser) => {
			if (browser) {
				localStorage.setItem(GITHUB_USER_KEY, JSON.stringify(user));
			}
			update((state) => ({ ...state, user }));
		},
		logout: () => {
			if (browser) {
				localStorage.removeItem(GITHUB_TOKEN_KEY);
				localStorage.removeItem(GITHUB_USER_KEY);
			}
			set({ token: null, user: null });
		},
		init: (token: string, user: GitHubUser) => {
			if (browser) {
				localStorage.setItem(GITHUB_TOKEN_KEY, token);
				localStorage.setItem(GITHUB_USER_KEY, JSON.stringify(user));
			}
			set({ token, user });
		}
	};
}

export const auth = createAuthStore();

// Helper function to fetch GitHub user info
export async function fetchGitHubUser(token: string): Promise<GitHubUser> {
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
