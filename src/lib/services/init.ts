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

			console.log('[Init] Step 1: Initializing service repository');
			await service.initializeServiceRepo(config);

			console.log('[Init] Step 2: Loading service config');
			const config_data = await service.getServiceConfig(config);
			serviceConfig.set(config_data);

			console.log('[Init] Step 3: Loading repositories');
			const allRepos = await github.getRepositories(config);

			// Always include 3db-service repo
			const serviceRepo = allRepos.find(repo => repo.name === '3db-service');
			const connectedRepos = allRepos.filter((repo) =>
				config_data.connectedRepos.includes(repo.full_name)
			);

			// Add service repo at the beginning if not already included
			if (serviceRepo && !connectedRepos.find(r => r.id === serviceRepo.id)) {
				connectedRepos.unshift(serviceRepo);
			}

			repositories.set(connectedRepos);

			console.log('[Init] Complete! Setting ready state');
			authStore.setReady(); // With PAT, we have all permissions we need
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

/**
 * Reset initialization state (for logout)
 */
export function resetInitialization() {
	isInitializing = false;
	initializationPromise = null;
	repositories.set([]);
	serviceConfig.set({ connectedRepos: [], version: 1 });
}
