import type { ServiceConfig } from '$lib/types';
import { DEFAULT_SERVICE_CONFIG, SERVICE_REPO_PATH, SERVICE_CONFIG_FILE } from '$lib/types';
import * as github from './github';

export async function initializeServiceRepo(config: github.GitHubConfig) {
	// First, try to find existing service repo
	const repos = await github.getRepositories(config);
	let serviceRepo = repos.find((repo) => repo.name === SERVICE_REPO_PATH);

	// If it doesn't exist, create it
	if (!serviceRepo) {
		serviceRepo = await github.createRepository(config, SERVICE_REPO_PATH);
	}

	// Try to get existing config
	try {
		const contents = await github.getContents(
			config,
			serviceRepo.owner.login,
			serviceRepo.name,
			SERVICE_CONFIG_FILE
		);

		if (!Array.isArray(contents)) {
			const fileContent = contents as { content: string };
			const configContent = atob(fileContent.content);
			const existingConfig = JSON.parse(configContent);

			// Validate and clean connected repos
			const validRepos = await validateAndCleanConnectedRepos(
				config,
				existingConfig.connectedRepos
			);

			// Update config if any repos were removed
			if (validRepos.length !== existingConfig.connectedRepos.length) {
				const updatedConfig = { ...existingConfig, connectedRepos: validRepos };
				await github.createFile(
					config,
					serviceRepo.owner.login,
					serviceRepo.name,
					SERVICE_CONFIG_FILE,
					JSON.stringify(updatedConfig, null, 2),
					'Clean up invalid repositories',
					fileContent.sha
				);
			}
		}
	} catch (error) {
		if ((error as any).status === 404) {
			// Create new config file if it doesn't exist
			await github.createFile(
				config,
				serviceRepo.owner.login,
				serviceRepo.name,
				SERVICE_CONFIG_FILE,
				JSON.stringify(DEFAULT_SERVICE_CONFIG, null, 2)
			);
		} else {
			throw error;
		}
	}

	return serviceRepo;
}
export async function getServiceConfig(config: github.GitHubConfig): Promise<ServiceConfig> {
	const repos = await github.getRepositories(config);
	const serviceRepo = repos.find((repo) => repo.name === SERVICE_REPO_PATH);
	if (!serviceRepo) throw new Error('Service repository not found');

	const contents = await github.getContents(
		config,
		serviceRepo.owner.login,
		serviceRepo.name,
		SERVICE_CONFIG_FILE
	);

	if (Array.isArray(contents)) throw new Error('Unexpected contents format');

	// Add a type assertion here
	const fileContent = contents as { content: string };
	const configContent = atob(fileContent.content);
	return JSON.parse(configContent);
}

export async function updateServiceConfig(
	config: github.GitHubConfig,
	serviceConfig: ServiceConfig
): Promise<void> {
	const repos = await github.getRepositories(config);
	const serviceRepo = repos.find((repo) => repo.name === SERVICE_REPO_PATH);
	if (!serviceRepo) throw new Error('Service repository not found');

	try {
		// Get current file contents to get the SHA
		const contents = await github.getContents(
			config,
			serviceRepo.owner.login,
			serviceRepo.name,
			SERVICE_CONFIG_FILE
		);

		if (Array.isArray(contents)) throw new Error('Unexpected contents format');

		// Use the SHA from the existing file
		const fileContent = contents as { sha: string };

		await github.createFile(
			config,
			serviceRepo.owner.login,
			serviceRepo.name,
			SERVICE_CONFIG_FILE,
			JSON.stringify(serviceConfig, null, 2),
			'Update service config',
			fileContent.sha // Pass the SHA
		);
	} catch (error) {
		// If file doesn't exist, create it without SHA
		if ((error as any).status === 404) {
			await github.createFile(
				config,
				serviceRepo.owner.login,
				serviceRepo.name,
				SERVICE_CONFIG_FILE,
				JSON.stringify(serviceConfig, null, 2),
				'Create service config'
			);
		} else {
			throw error;
		}
	}
}

export async function validateAndCleanConnectedRepos(
	config: github.GitHubConfig,
	connectedRepos: string[]
): Promise<string[]> {
	const validRepos: string[] = [];

	for (const repoFullName of connectedRepos) {
		const [owner, repo] = repoFullName.split('/');
		if (await github.checkRepo(config, owner, repo)) {
			validRepos.push(repoFullName);
		} else {
			console.log(`Repository ${repoFullName} no longer exists, removing from config`);
		}
	}

	return validRepos;
}
