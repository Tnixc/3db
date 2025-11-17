<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import Icon from '@iconify/svelte';
	import { authStore } from '$lib/stores/auth';

	let token = $state('');
	let error = $state<string | null>(null);

	const isLoading = $derived($authStore.status === 'logging_in');

	async function handleLogin() {
		if (!token.trim()) {
			error = 'Please enter a token';
			return;
		}

		error = null;
		try {
			await authStore.login(token);
		} catch (err) {
			error = 'Invalid token or unable to fetch user information';
			console.error('Login error:', err);
		}
	}
</script>

<div class="p-8">
	<h1 class="mb-4 text-3xl font-bold">3db</h1>

	<div class="mb-6 max-w-xl space-y-4">
		<div>
			<h2 class="mb-2 text-xl font-semibold">Login with GitHub Token</h2>
			<p class="text-muted-foreground text-sm">
				Enter your GitHub Personal Access Token to get started. The token is stored locally in your
				browser.
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
				<p class="text-destructive text-sm">{error}</p>
			{/if}
			<Button class="w-full" onclick={handleLogin} disabled={isLoading || !token.trim()}>
				{#if isLoading}
					<Icon icon="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
					Verifying...
				{:else}
					<Icon icon="lucide:log-in" class="mr-2 h-4 w-4" />
					Login
				{/if}
			</Button>
		</div>

		<div class="border-primary rounded-lg border bg-primary/10 p-4">
			<h3 class="mb-2 flex items-center gap-2 font-medium text-primary-foreground">
				<Icon icon="lucide:info" class="h-4 w-4" />
				After logging in
			</h3>
			<ol class="list-inside list-decimal space-y-1 text-sm text-primary-foreground">
				<li>Initial setup may take 15-30 seconds</li>
				<li>A repository called '3db-service' will be created to store metadata</li>
				<li>You'll see a loading screen while we set everything up</li>
				<li>Once ready, you can start managing your repositories!</li>
			</ol>
		</div>

		<div class="bg-muted rounded-lg p-4">
			<h3 class="mb-2 font-medium">How to create a GitHub token:</h3>
			<ol class="text-muted-foreground list-inside list-decimal space-y-1 text-sm">
				<li>
					Go to <a
						href="https://github.com/settings/tokens/new"
						target="_blank"
						class="hover:text-primary underline">GitHub Token Settings</a
					>
				</li>
				<li>Click "Generate new token (classic)"</li>
				<li>Give it a name (e.g., "3db access")</li>
				<li>Select scopes: <code class="bg-background rounded px-1">repo</code> (all)</li>
				<li>Click "Generate token" and copy it</li>
			</ol>
		</div>
	</div>

	<div class="max-w-2xl space-y-6 py-8">
		<div>
			<h2 class="mb-2 text-xl font-semibold">Use GitHub as a CDN</h2>
			<p class="text-muted-foreground">
				3db provides a simple interface to use GitHub repositories as a content delivery network or
				file store. Pretty flaky, but works.
			</p>
		</div>

		<div class="space-y-4">
			<h3 class="font-medium">Features:</h3>
			<ul class="text-muted-foreground list-inside list-disc space-y-2">
				<li>Create and connect multiple repositories</li>
				<li>Upload and delete files</li>
				<li>Browse files and folders</li>
				<li>Get direct CDN links</li>
			</ul>
		</div>

		<div class="bg-muted rounded-lg p-4">
			<h3 class="mb-2 font-medium">How it works:</h3>
			<p class="text-muted-foreground text-sm">
				A repository called '3db-service' will be created to store metadata. You can then create or
				connect repositories to use as storage. Files are stored in public GitHub repositories and
				served via GitHub's CDN.
			</p>
		</div>

		<div class="bg-destructive/10 rounded-lg p-4">
			<h3 class="text-destructive mb-2 font-medium">Warning</h3>
			<p class="text-destructive text-sm">
				This is an experimental project. Only use for non-critical data. Files are public and
				GitHub's 5GB repository limit applies.
			</p>
		</div>

		<div class="text-muted-foreground text-sm">
			<a href="https://github.com/tnixc/3db" class="hover:text-primary underline" target="_blank">
				View source code on GitHub
			</a>
		</div>
	</div>
</div>
