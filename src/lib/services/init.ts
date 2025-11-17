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
 * Now uses server-side API to access httpOnly cookie
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
			console.log('[Init] Calling server-side initialization API');
			const response = await fetch('/api/init', {
				method: 'POST',
				credentials: 'same-origin'
			});

			if (!response.ok) {
				throw new Error(`Initialization failed: ${response.statusText}`);
			}

			const data = await response.json();

			console.log('[Init] Service config loaded');
			serviceConfig.set(data.config);

			console.log('[Init] Repositories loaded');
			repositories.set(data.repositories);

			console.log('[Init] Complete! Setting ready state');
			authStore.setReady();
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
