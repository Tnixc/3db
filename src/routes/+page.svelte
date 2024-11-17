<script lang="ts">
	import { currentRepository } from '$lib/stores/repositories';
	import Button from '$lib/components/ui/button/button.svelte';
	import FileBrowser from '$lib/components/file-browser.svelte';
	import Icon from '@iconify/svelte';
	import type { GitHubConfig } from '$lib/services/github';

	let { data } = $props();
	let githubConfig = $state<GitHubConfig | null>(null);
	let isLoading = $state(true);

	async function signInWithGithub() {
		const { error } = await data.supabase.auth.signInWithOAuth({
			provider: 'github',
			options: {
				// Request necessary GitHub scopes for repository management
				scopes: 'repo administration',
				redirectTo: `${window.location.origin}/auth/callback`
			}
		});
		if (error) console.error('Auth error:', error);
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
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		if (data.user) {
			initGitHubConfig();
		} else {
			isLoading = false;
		}
	});
</script>

<div class="container mx-auto p-4">
	{#if !isLoading}
		{#if !data.user}
			<div class="p-8">
				<h1 class="mb-4 text-2xl font-bold">3db</h1>
				<Button onclick={signInWithGithub}>
					<Icon icon="lucide:github" class="h-5 w-5" />
					Login with GitHub
				</Button>
				<div class="py-5">
					<h2 class="py-4 text-lg">Use github as a cdn or file store</h2>
					<p class="text-secondary-foreground">How does it work?</p>
					<p class="max-w-lg text-muted-foreground">
						A repository called '3db-service' will be created. It houses a json file that keep
						tracks which repos are conencted. Internally it uses github's api to upload and delete
						files/repos for you, and provides you with an interface to do so. Github strongly
						recommends keeping repos under 5gb.
					</p>
				</div>
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
	{/if}
</div>
