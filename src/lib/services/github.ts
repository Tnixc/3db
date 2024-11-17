import type { FileContent, Repository } from '$lib/types';

export type GitHubConfig = {
	token: string;
	userEmail: string;
};

const createCommitter = (userEmail: string) => ({
	name: 'db3 service',
	email: userEmail
});

async function request(
	config: GitHubConfig,
	endpoint: string,
	options: RequestInit = {}
): Promise<any> {
	const response = await fetch(`https://api.github.com${endpoint}`, {
		...options,
		headers: {
			Authorization: `token ${config.token}`,
			Accept: 'application/vnd.github.v3+json',
			...options.headers
		}
	});

	if (!response.ok) {
		throw new Error(`GitHub API error: ${response.statusText}`);
	}

	return response.json();
}

export async function createRepository(config: GitHubConfig, name: string): Promise<Repository> {
	return request(config, '/user/repos', {
		method: 'POST',
		body: JSON.stringify({
			name,
			private: false,
			auto_init: true
		})
	});
}

export async function getRepositories(config: GitHubConfig): Promise<Repository[]> {
	return request(config, '/user/repos?per_page=100&sort=created');
}

export async function getContents(
	config: GitHubConfig,
	owner: string,
	repo: string,
	path = ''
): Promise<FileContent[]> {
	return request(config, `/repos/${owner}/${repo}/contents/${path}`);
}

// Add utility function for base64 encoding
function bytesToBase64(bytes: Uint8Array): string {
	const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join('');
	return btoa(binString);
}

export async function createFile(
	config: GitHubConfig,
	owner: string,
	repo: string,
	path: string,
	content: string | ArrayBuffer,
	message = 'Add file via db3',
	sha?: string
): Promise<void> {
	const body: any = {
		message,
		committer: createCommitter(config.userEmail)
	};

	// Handle both text and binary content
	if (typeof content === 'string') {
		body.content = btoa(content); // Handle UTF-8 text properly
	} else {
		body.content = bytesToBase64(new Uint8Array(content));
	}

	// Only include SHA if updating an existing file
	if (sha) {
		body.sha = sha;
	}

	await request(config, `/repos/${owner}/${repo}/contents/${path}`, {
		method: 'PUT',
		body: JSON.stringify(body)
	});
}

export async function deleteFile(
	config: GitHubConfig,
	owner: string,
	repo: string,
	path: string,
	sha: string,
	message = 'Delete file via db3'
): Promise<void> {
	await request(config, `/repos/${owner}/${repo}/contents/${path}`, {
		method: 'DELETE',
		body: JSON.stringify({
			message,
			sha,
			committer: createCommitter(config.userEmail)
		})
	});
}

export async function deleteRepository(
	config: GitHubConfig,
	owner: string,
	repo: string
): Promise<void> {
	await request(config, `/repos/${owner}/${repo}`, {
		method: 'DELETE'
	});
}

export async function checkRepo(
	config: GitHubConfig,
	owner: string,
	repo: string
): Promise<boolean> {
	try {
		await request(config, `/repos/${owner}/${repo}`);
		return true;
	} catch (error) {
		return false;
	}
}
