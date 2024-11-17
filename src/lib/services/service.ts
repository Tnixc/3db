import type { ServiceConfig } from '$lib/types';
import { DEFAULT_SERVICE_CONFIG, SERVICE_REPO_PATH, SERVICE_CONFIG_FILE } from '$lib/types';
import * as github from './github';

export async function initializeServiceRepo(config: github.GitHubConfig) {
  // Create or get the service repository
  let serviceRepo;
  try {
    serviceRepo = await github.createRepository(config, SERVICE_REPO_PATH);
  } catch (error) {
    // If repo already exists, fetch it
    const repos = await github.getRepositories(config);
    serviceRepo = repos.find((repo) => repo.name === SERVICE_REPO_PATH);
    if (!serviceRepo) throw error;
  }

  // Initialize with default config if it doesn't exist
  try {
    await github.getContents(config, serviceRepo.owner.login, serviceRepo.name, SERVICE_CONFIG_FILE);
  } catch {
    await github.createFile(
      config,
      serviceRepo.owner.login,
      serviceRepo.name,
      SERVICE_CONFIG_FILE,
      JSON.stringify(DEFAULT_SERVICE_CONFIG, null, 2)
    );
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