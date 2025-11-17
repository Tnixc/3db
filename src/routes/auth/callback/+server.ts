import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '$env/static/private';
import { dev } from '$app/environment';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const error = url.searchParams.get('error');

	if (error || !code) {
		console.error('OAuth error:', error);
		throw redirect(302, '/?error=oauth_failed');
	}

	try {
		// Determine the redirect URI (must match what we sent to GitHub)
		const redirectUri = dev
			? 'http://localhost:5173/auth/callback'
			: `${url.origin}/auth/callback`;

		// Exchange code for access token
		const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify({
				client_id: GITHUB_CLIENT_ID,
				client_secret: GITHUB_CLIENT_SECRET,
				code,
				redirect_uri: redirectUri
			})
		});

		const tokenData = await tokenResponse.json();

		if (tokenData.error || !tokenData.access_token) {
			console.error('Token exchange error:', tokenData.error_description || tokenData.error);
			throw redirect(302, '/?error=token_exchange_failed');
		}

		const accessToken = tokenData.access_token;

		// Log the scopes we received (helps with debugging permission issues)
		console.log('[Auth] Received token with scopes:', tokenData.scope);

		// Verify token and get user info
		const userResponse = await fetch('https://api.github.com/user', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: 'application/vnd.github.v3+json'
			}
		});

		if (!userResponse.ok) {
			console.error('Failed to fetch user info');
			throw redirect(302, '/?error=user_fetch_failed');
		}

		const userData = await userResponse.json();

		// Ensure we have user email (required for commits)
		if (!userData.email) {
			// Fetch user emails separately
			const emailsResponse = await fetch('https://api.github.com/user/emails', {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: 'application/vnd.github.v3+json'
				}
			});

			if (emailsResponse.ok) {
				const emails = await emailsResponse.json();
				const primaryEmail = emails.find((e: any) => e.primary);
				if (primaryEmail) {
					userData.email = primaryEmail.email;
				}
			}
		}

		// Set httpOnly cookie for token (secure, not accessible by JavaScript)
		cookies.set('github_token', accessToken, {
			path: '/',
			httpOnly: true, // Protected from JavaScript
			secure: !dev, // HTTPS only in production
			sameSite: 'lax', // CSRF protection (lax for OAuth redirect)
			maxAge: 60 * 60 * 24 * 30 // 30 days
		});

		// Set user info cookie (readable by client for UI)
		cookies.set(
			'github_user',
			JSON.stringify({
				login: userData.login,
				name: userData.name || userData.login,
				email: userData.email || `${userData.login}@users.noreply.github.com`,
				avatar_url: userData.avatar_url
			}),
			{
				path: '/',
				httpOnly: false, // Readable by client
				secure: !dev,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 30
			}
		);

		throw redirect(302, '/');
	} catch (error) {
		if (error instanceof Response) {
			throw error; // Re-throw redirect responses
		}
		console.error('OAuth callback error:', error);
		throw redirect(302, '/?error=auth_failed');
	}
};
