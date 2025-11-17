import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as github from '$lib/services/github';
import * as service from '$lib/services/service';
import type { GitHubConfig } from '$lib/services/github';

// POST initialize app (service repo + config + repos)
export const POST: RequestHandler = async ({ cookies }) => {
	const token = cookies.get('github_token');
	const userStr = cookies.get('github_user');

	if (!token || !userStr) {
		throw error(401, 'Not authenticated');
	}

	try {
		const user = JSON.parse(userStr);
		const config: GitHubConfig = { token, userEmail: user.email };

		// Step 1: Initialize service repository
		await service.initializeServiceRepo(config);

		// Step 2: Load service config
		const config_data = await service.getServiceConfig(config);

		// Step 3: Load repositories
		const allRepos = await github.getRepositories(config);

		// Always include 3db-service repo
		const serviceRepo = allRepos.find((repo) => repo.name === '3db-service');
		const connectedRepos = allRepos.filter((repo) =>
			config_data.connectedRepos.includes(repo.full_name)
		);

		// Add service repo at the beginning if not already included
		if (serviceRepo && !connectedRepos.find((r) => r.id === serviceRepo.id)) {
			connectedRepos.unshift(serviceRepo);
		}

		return json({
			config: config_data,
			repositories: connectedRepos
		});
	} catch (err) {
		console.error('Error during initialization:', err);
		throw error(500, err instanceof Error ? err.message : 'Initialization failed');
	}
};
