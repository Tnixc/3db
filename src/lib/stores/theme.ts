import { writable } from 'svelte/store';

type Theme = 'light' | 'dark';

function createThemeStore() {
	// Get initial theme from localStorage or system preference
	const getInitialTheme = (): Theme => {
		if (typeof window === 'undefined') return 'light';

		const savedTheme = localStorage.getItem('theme') as Theme;
		if (savedTheme) return savedTheme;

		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	};

	const { subscribe, set } = writable<Theme>(getInitialTheme());

	return {
		subscribe,
		toggle: () => {
			if (typeof window === 'undefined') return;

			const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
			document.documentElement.classList.remove('light', 'dark');
			document.documentElement.classList.add(newTheme);
			localStorage.setItem('theme', newTheme);
			set(newTheme);
		},
		// Only used for initialization
		set: (theme: Theme) => {
			if (typeof window === 'undefined') return;

			document.documentElement.classList.remove('light', 'dark');
			document.documentElement.classList.add(theme);
			localStorage.setItem('theme', theme);
			set(theme);
		}
	};
}

export const theme = createThemeStore();
