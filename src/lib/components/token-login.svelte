<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import Icon from '@iconify/svelte';
	import { appState } from '$lib/stores/auth';

	let token = $state('');

	const state = $derived($appState);
	const isLoading = $derived(state.status === 'logging_in');
	const error = $derived(state.status === 'error' ? state.error : null);

	async function handleLogin() {
		if (!token.trim()) {
			appState.setError('Please enter a token');
			return;
		}

		await appState.login(token);
	}
</script>

<div class="p-8">
	<h1 class="mb-4 text-3xl font-bold">3db</h1>

	<div class="mb-6 max-w-xl space-y-4">
		<div>
			<h2 class="mb-2 text-xl font-semibold">Login with GitHub Token</h2>
			<p class="text-sm text-muted-foreground">
				Enter your GitHub Personal Access Token to get started. The token is stored locally in
				your browser.
			</p>
		</div>

		<div class="space-y-2">
			<Input
				type="password"
				bind:value={token}
				placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
				disabled={isLoading}
				onkeydown={(e) => {
					if (e.key === 'Enter') handleLogin();
				}}
			/>
			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}
			<Button onclick={handleLogin} disabled={isLoading || !token.trim()} class="w-full">
				{#if isLoading}
					<Icon icon="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
					Verifying...
				{:else}
					<Icon icon="lucide:log-in" class="mr-2 h-4 w-4" />
					Login
				{/if}
			</Button>
		</div>

		<div class="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
			<h3 class="mb-2 flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
				<Icon icon="lucide:info" class="h-4 w-4" />
				After logging in
			</h3>
			<ol class="list-inside list-decimal space-y-1 text-sm text-blue-600 dark:text-blue-400">
				<li>Initial setup may take 15-30 seconds (creating service repository)</li>
				<li>You'll be prompted to install the 3db GitHub App</li>
				<li>After installing the app, return to this page to continue</li>
				<li>Refresh if repositories don't load immediately</li>
			</ol>
		</div>

		<div class="rounded-lg bg-muted p-4">
			<h3 class="mb-2 font-medium">How to create a GitHub token:</h3>
			<ol class="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
				<li>
					Go to <a
						href="https://github.com/settings/tokens/new"
						target="_blank"
						class="underline hover:text-primary">GitHub Token Settings</a>
				</li>
				<li>Click "Generate new token (classic)"</li>
				<li>Give it a name (e.g., "3db access")</li>
				<li>Select scopes: <code class="rounded bg-background px-1">repo</code> (all)</li>
				<li>Click "Generate token" and copy it</li>
			</ol>
		</div>
	</div>

	<div class="max-w-2xl space-y-6 py-8">
		<div>
			<h2 class="mb-2 text-xl font-semibold">Use GitHub as a CDN</h2>
			<p class="text-muted-foreground">
				3db provides a simple interface to use GitHub repositories as a content delivery network
				or file store. Pretty flaky, but works.
			</p>
		</div>

		<div class="space-y-4">
			<h3 class="font-medium">Features:</h3>
			<ul class="list-inside list-disc space-y-2 text-muted-foreground">
				<li>Create and connect multiple repositories</li>
				<li>Upload and delete files</li>
				<li>Browse files and folders</li>
				<li>Get direct CDN links</li>
			</ul>
		</div>

		<div class="rounded-lg bg-muted p-4">
			<h3 class="mb-2 font-medium">How it works:</h3>
			<p class="text-sm text-muted-foreground">
				A repository called '3db-service' will be created to store metadata. You can then create
				or connect repositories to use as storage. Files are stored in public GitHub repositories
				and served via GitHub's CDN.
			</p>
		</div>

		<div class="rounded-lg bg-destructive/10 p-4">
			<h3 class="mb-2 font-medium text-destructive">Warning</h3>
			<p class="text-sm text-destructive">
				This is an experimental project. Only use for non-critical data. Files are public and
				GitHub's 5GB repository limit applies.
			</p>
		</div>

		<div class="text-sm text-muted-foreground">
			<a href="https://github.com/tnixc/3db" class="underline hover:text-primary" target="_blank">
				View source code on GitHub
			</a>
		</div>
	</div>
</div>
