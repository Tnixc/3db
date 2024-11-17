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
				<h1 class="mb-4 text-3xl font-bold">3db</h1>
				<Button onclick={signInWithGithub}>
					<Icon icon="lucide:github" class="h-5 w-5" />
					Login with GitHub
				</Button>

				<div class="max-w-2xl space-y-6 py-8">
					<div>
						<h2 class="mb-2 text-xl font-semibold">Use GitHub as a CDN</h2>
						<p class="text-muted-foreground">
							3db provides a simple interface to use GitHub repositories as a content delivery
							network or file store. Pretty flaky, but works.
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
							A repository called '3db-service' will be created to store metadata. You can then
							create or connect repositories to use as storage. Files are stored in public GitHub
							repositories and served via GitHub's CDN.
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
						<a
							href="https://github.com/tnixc/3db"
							class="underline hover:text-primary"
							target="_blank"
						>
							View source code on GitHub
						</a>
					</div>
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
