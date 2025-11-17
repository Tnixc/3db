import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as github from '$lib/services/github';
import type { GitHubConfig } from '$lib/services/github';

// GET contents
export const GET: RequestHandler = async ({ cookies, params, url }) => {
	const token = cookies.get('github_token');
	const userStr = cookies.get('github_user');

	if (!token || !userStr) {
		throw error(401, 'Not authenticated');
	}

	const { owner, repo } = params;
	const path = url.searchParams.get('path') || '';

	try {
		const user = JSON.parse(userStr);
		const config: GitHubConfig = { token, userEmail: user.email };
		const contents = await github.getContents(config, owner, repo, path);
		return json(contents);
	} catch (err) {
		console.error('Error fetching contents:', err);
		throw error(500, 'Failed to fetch contents');
	}
};

// PUT create/update file
export const PUT: RequestHandler = async ({ cookies, params, request }) => {
	const token = cookies.get('github_token');
	const userStr = cookies.get('github_user');

	if (!token || !userStr) {
		throw error(401, 'Not authenticated');
	}

	const { owner, repo } = params;

	try {
		const user = JSON.parse(userStr);
		const config: GitHubConfig = { token, userEmail: user.email };
		const { path, content, message, sha } = await request.json();

		if (!path || content === undefined) {
			throw error(400, 'Path and content are required');
		}

		await github.createFile(config, owner, repo, path, content, message, sha);
		return json({ success: true });
	} catch (err) {
		console.error('Error creating/updating file:', err);
		throw error(500, 'Failed to create/update file');
	}
};

// DELETE file or folder
export const DELETE: RequestHandler = async ({ cookies, params, request }) => {
	const token = cookies.get('github_token');
	const userStr = cookies.get('github_user');

	if (!token || !userStr) {
		throw error(401, 'Not authenticated');
	}

	const { owner, repo } = params;

	try {
		const user = JSON.parse(userStr);
		const config: GitHubConfig = { token, userEmail: user.email };
		const { path, sha, isFolder } = await request.json();

		if (!path) {
			throw error(400, 'Path is required');
		}

		if (isFolder) {
			await github.deleteFolder(config, owner, repo, path);
		} else {
			if (!sha) {
				throw error(400, 'SHA is required for file deletion');
			}
			await github.deleteFile(config, owner, repo, path, sha);
		}

		return json({ success: true });
	} catch (err) {
		console.error('Error deleting file/folder:', err);
		throw error(500, 'Failed to delete file/folder');
	}
};
