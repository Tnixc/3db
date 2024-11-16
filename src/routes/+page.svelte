<script lang="ts">
	import { currentRepository } from '$lib/stores/repositories';
	import FileBrowser from '$lib/components/file-browser.svelte';
	import CreateRepoDialog from '$lib/components/create-repo-dialog.svelte';
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
			<button
				class="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
				onclick={signInWithGithub}
			>
				Login with GitHub
			</button>
		</div>
	{:else if !githubConfig}
		<div class="py-8 text-center">
			<p class="mb-4 text-muted-foreground">
				Unable to access GitHub. Please try logging in again.
			</p>
			<button
				class="rounded-md bg-destructive px-4 py-2 text-white hover:bg-destructive/90"
				onclick={signOut}
			>
				Sign Out
			</button>
		</div>
	{:else}
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<h1 class="text-2xl font-bold">Repository Database</h1>
				<div class="flex items-center gap-4">
					<button
						class="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
						onclick={() => (showCreateRepo = true)}
					>
						New Repository
					</button>
					<button
						class="rounded-md bg-destructive px-4 py-2 text-white hover:bg-destructive/90"
						onclick={signOut}
					>
						Sign Out
					</button>
				</div>
			</div>

			<FileBrowser config={githubConfig} />

			<CreateRepoDialog bind:open={showCreateRepo} config={githubConfig} />
		</div>
	{/if}
</div>
