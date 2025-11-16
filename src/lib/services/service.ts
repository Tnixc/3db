import type { ServiceConfig } from '$lib/types';
import { DEFAULT_SERVICE_CONFIG, SERVICE_REPO_PATH, SERVICE_CONFIG_FILE } from '$lib/types';
import * as github from './github';

let isInitializing = false;
let initPromise: Promise<any> | null = null;

export async function initializeServiceRepo(config: github.GitHubConfig) {
	// If already initializing, return the existing promise to prevent race conditions
	if (isInitializing && initPromise) {
		console.log('Service repo initialization already in progress, reusing promise');
		return initPromise;
	}

	isInitializing = true;
	initPromise = _initializeServiceRepo(config);

	try {
		const result = await initPromise;
		return result;
	} finally {
		isInitializing = false;
		initPromise = null;
	}
}

async function _initializeServiceRepo(config: github.GitHubConfig) {
	// First, try to find existing service repo
	const repos = await github.getRepositories(config);
	let serviceRepo = repos.find((repo) => repo.name === SERVICE_REPO_PATH);

	// If it doesn't exist, create it
	if (!serviceRepo) {
		serviceRepo = await github.createRepository(config, SERVICE_REPO_PATH);

		// Create initial config file immediately after creating repo
		try {
			await github.createFile(
				config,
				serviceRepo.owner.login,
				serviceRepo.name,
				SERVICE_CONFIG_FILE,
				JSON.stringify(
					{
						...DEFAULT_SERVICE_CONFIG,
						connectedRepos: [`${serviceRepo.owner.login}/${SERVICE_REPO_PATH}`]
					},
					null,
					2
				)
			);
		} catch (error: any) {
			// If we get a 409 Conflict, it means the file was already created
			// (probably by another concurrent request). This is fine, just continue.
			if (error.status !== 409) {
				throw error;
			}
			console.log('Config file already exists (409), continuing...');
		}

		return serviceRepo;
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
			const fileContent = contents as { content: string; sha: string };
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
	} catch (error: any) {
		if (error.status === 404) {
			// Create new config file if it doesn't exist
			try {
				await github.createFile(
					config,
					serviceRepo.owner.login,
					serviceRepo.name,
					SERVICE_CONFIG_FILE,
					JSON.stringify(
						{
							...DEFAULT_SERVICE_CONFIG,
							connectedRepos: [`${serviceRepo.owner.login}/${SERVICE_REPO_PATH}`]
						},
						null,
						2
					)
				);
			} catch (createError: any) {
				// If we get a 409 Conflict, it means the file was created by another request
				if (createError.status !== 409) {
					throw createError;
				}
				console.log('Config file was created concurrently (409), continuing...');
			}
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

	// Ensure 3db-service is always in the connectedRepos list
	const serviceRepoFullName = serviceRepo.full_name;
	if (!serviceConfig.connectedRepos.includes(serviceRepoFullName)) {
		serviceConfig.connectedRepos.unshift(serviceRepoFullName);
		console.log('Ensured 3db-service is in connected repos list');
	}

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
	let serviceRepoFullName: string | null = null;

	for (const repoFullName of connectedRepos) {
		const [owner, repo] = repoFullName.split('/');

		// Track the service repo
		if (repo === SERVICE_REPO_PATH) {
			serviceRepoFullName = repoFullName;
		}

		if (await github.checkRepo(config, owner, repo)) {
			validRepos.push(repoFullName);
		} else {
			console.log(`Repository ${repoFullName} no longer exists, removing from config`);
		}
	}

	// Ensure 3db-service is always included if not already present
	if (!serviceRepoFullName) {
		const repos = await github.getRepositories(config);
		const serviceRepo = repos.find((r) => r.name === SERVICE_REPO_PATH);
		if (serviceRepo) {
			serviceRepoFullName = serviceRepo.full_name;
			validRepos.unshift(serviceRepoFullName);
			console.log('Added 3db-service repository to connected repos (was missing)');
		}
	}

	return validRepos;
}
