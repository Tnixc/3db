import type { GitHubConfig } from './github';
import * as github from './github';
import * as service from './service';
import { authStore } from '$lib/stores/auth';
import { serviceConfig } from '$lib/stores/service-config';
import { repositories } from '$lib/stores/repositories';

let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize the app once user is logged in
 * This runs exactly once and handles all setup sequentially
 */
export async function initializeApp(token: string, userLogin: string, userEmail: string): Promise<void> {
	// If already initializing, return existing promise to prevent duplicate calls
	if (isInitializing && initializationPromise) {
		console.log('[Init] Already initializing, returning existing promise');
		return initializationPromise;
	}

	isInitializing = true;
	authStore.setInitializing();

	initializationPromise = (async () => {
		try {
			const config: GitHubConfig = { token, userEmail };

			console.log('[Init] Step 1: Checking GitHub App installation');
			const hasGithubApp = await checkGithubAppInstallation(token);

			console.log('[Init] Step 2: Initializing service repository');
			await service.initializeServiceRepo(config);

			console.log('[Init] Step 3: Loading service config');
			const config_data = await service.getServiceConfig(config);
			serviceConfig.set(config_data);

			console.log('[Init] Step 4: Loading repositories');
			const allRepos = await github.getRepositories(config);
			const connectedRepos = allRepos.filter((repo) =>
				config_data.connectedRepos.includes(repo.full_name)
			);
			repositories.set(connectedRepos);

			console.log('[Init] Complete! Setting ready state');
			authStore.setReady(hasGithubApp);
		} catch (error) {
			console.error('[Init] Error during initialization:', error);
			authStore.setError(error instanceof Error ? error.message : 'Initialization failed');
			throw error;
		} finally {
			isInitializing = false;
			initializationPromise = null;
		}
	})();

	return initializationPromise;
}

async function checkGithubAppInstallation(token: string): Promise<boolean> {
	try {
		const response = await fetch('/api/github/check-installation', {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			}
		});

		if (!response.ok) return false;

		const { installed } = await response.json();
		return installed;
	} catch (error) {
		console.error('[Init] Error checking GitHub app installation:', error);
		return false;
	}
}

/**
 * Recheck GitHub App installation status
 * Called when user clicks "I've Installed It" after installing the app
 */
export async function recheckInstallation(token: string): Promise<boolean> {
	console.log('[Init] Rechecking GitHub App installation...');
	const hasGithubApp = await checkGithubAppInstallation(token);

	if (hasGithubApp) {
		console.log('[Init] GitHub App is now installed! Updating state...');
		// Update the auth state to mark app as installed
		authStore.setReady(true);
	} else {
		console.log('[Init] GitHub App still not detected');
	}

	return hasGithubApp;
}

/**
 * Reset initialization state (for logout)
 */
export function resetInitialization() {
	isInitializing = false;
	initializationPromise = null;
	repositories.set([]);
	serviceConfig.set({ connectedRepos: [] });
}
