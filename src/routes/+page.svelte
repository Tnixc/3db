<script lang="ts">
	import { currentRepository } from '$lib/stores/repositories';
	import Button from '$lib/components/ui/button/button.svelte';
	import FileBrowser from '$lib/components/file-browser.svelte';
	import Icon from '@iconify/svelte';
	import type { GitHubConfig } from '$lib/services/github';

	let { data } = $props();
	let showCreateRepo = $state(false);
	let githubConfig = $state<GitHubConfig | null>(null);

	async function signInWithGithub() {
		const { error } = await data.supabase.auth.signInWithOAuth({
			provider: 'github',
			options: {
				// Request necessary GitHub scopes for repository management
				scopes: 'repo delete_repo',
				redirectTo: `${window.location.origin}/auth/callback`
			}
		});
		if (error) console.error('Auth error:', error);
	}

	async function signOut() {
		await data.supabase.auth.signOut();
		window.location.reload();
	}

	async function initGitHubConfig() {
		if (!data.supabase || !data.user) return;

		try {
			const {
				data: { session }
			} = await data.supabase.auth.getSession();
			if (!session?.provider_token) {
				console.error('No GitHub token found in session');
				return;
			}

			githubConfig = {
				token: session.provider_token,
				userEmail: data.user.email ?? 'unknown'
			};
		} catch (error) {
			console.error('Error initializing GitHub config:', error);
		}
	}

	$effect(() => {
		if (data.user) {
			initGitHubConfig();
		}
	});
</script>

<div class="container mx-auto p-4">
	{#if !data.user}
		<div class="py-8 text-center">
			<h1 class="mb-4 text-2xl font-bold">GitHub Repository Database</h1>
			<Button onclick={signInWithGithub}>
				<Icon icon="lucide:github" class="h-5 w-5" />
				Login with GitHub
			</Button>
		</div>
	{:else if !githubConfig}
		<div class="py-8 text-center">
			<p class="mb-4 text-muted-foreground">
				Unable to access GitHub. Please try logging in again.
			</p>
		</div>
	{:else}
		<div class="space-y-4">
			<FileBrowser config={githubConfig} />
		</div>
	{/if}
</div>
