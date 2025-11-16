<script lang="ts">
	import { currentRepository } from '$lib/stores/repositories';
	import FileBrowser from '$lib/components/file-browser.svelte';
	import TokenLogin from '$lib/components/token-login.svelte';
	import type { GitHubConfig } from '$lib/services/github';
	import { auth } from '$lib/stores/auth';

	let githubConfig = $state<GitHubConfig | null>(null);
	let isLoading = $state(true);
	let hasInitialized = $state(false);

	$effect(() => {
		if ($auth.user && !hasInitialized) {
			hasInitialized = true;
			if ($auth.token) {
				githubConfig = {
					token: $auth.token,
					userEmail: $auth.user.email
				};
			}
			isLoading = false;
		} else if (!$auth.user) {
			hasInitialized = false;
			githubConfig = null;
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
