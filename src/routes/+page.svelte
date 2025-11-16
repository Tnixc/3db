<script lang="ts">
	import FileBrowser from '$lib/components/file-browser.svelte';
	import TokenLogin from '$lib/components/token-login.svelte';
	import type { GitHubConfig } from '$lib/services/github';
	import { appState } from '$lib/stores/auth';

	const state = $derived($appState);

	const githubConfig = $derived<GitHubConfig | null>(
		state.status === 'ready' || state.status === 'initializing'
			? {
					token: state.token,
					userEmail: state.user.email
				}
			: null
	);
</script>

<div class="container mx-auto p-4">
	{#if state.status === 'unauthenticated' || state.status === 'logging_in'}
		<TokenLogin />
	{:else if state.status === 'error'}
		<div class="p-8">
			<div class="rounded-lg border border-destructive bg-destructive/10 p-4">
				<h2 class="mb-2 text-lg font-semibold text-destructive">Error</h2>
				<p class="text-sm text-destructive">{state.error}</p>
				<button
					class="mt-4 rounded bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90"
					onclick={() => appState.logout()}
				>
					Return to Login
				</button>
			</div>
		</div>
	{:else if state.status === 'ready' && githubConfig && state.hasGithubApp}
		<div class="space-y-4">
			<FileBrowser config={githubConfig} />
		</div>
	{/if}
</div>
