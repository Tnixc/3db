import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	// Clear both cookies
	cookies.delete('github_token', { path: '/' });
	cookies.delete('github_user', { path: '/' });

	throw redirect(302, '/');
};
