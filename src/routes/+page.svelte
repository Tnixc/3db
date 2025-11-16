<script lang="ts">
	import { currentRepository } from '$lib/stores/repositories';
	import FileBrowser from '$lib/components/file-browser.svelte';
	import TokenLogin from '$lib/components/token-login.svelte';
	import type { GitHubConfig } from '$lib/services/github';
	import { auth } from '$lib/stores/auth';

	let githubConfig = $state<GitHubConfig | null>(null);
	let isLoading = $state(true);

	async function initGitHubConfig() {
		if (!$auth.token || !$auth.user) return;

		try {
			githubConfig = {
				token: $auth.token,
				userEmail: $auth.user.email
			};
		} catch (error) {
			console.error('Error initializing GitHub config:', error);
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		if ($auth.user) {
			initGitHubConfig();
		} else {
			isLoading = false;
		}
	});
</script>

<div class="container mx-auto p-4">
	{#if !isLoading}
		{#if !$auth.user}
			<TokenLogin />
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
