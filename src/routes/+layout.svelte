<script lang="ts">
	import '../app.css';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Button } from '$lib/components/ui/button';
	import { currentRepository, repositories } from '$lib/stores/repositories';
	import * as github from '$lib/services/github';
	import type { Snippet } from 'svelte';

	let { data, children } = $props<{
		data: App.PageData;
		children: Snippet;
	}>();

	let sidebarOpen = $state(true);
	let githubConfig: github.GitHubConfig | null = $state(null);
	let showUploadDialog = $state(false);

	async function initGitHubConfig() {
		if (!data.supabase || !data.user) return;

		try {
			// Get the current session which includes provider tokens
			const {
				data: { session }
			} = await data.supabase.auth.getSession();
			if (!session?.provider_token) return;

			githubConfig = {
				token: session.provider_token,
				userEmail: data.user.email ?? 'unknown'
			};

			await loadRepositories();
		} catch (error) {
			console.error('Error initializing GitHub config:', error);
		}
	}

	async function loadRepositories() {
		if (!githubConfig) return;

		try {
			const repos = await github.getRepositories(githubConfig);
			repositories.set(repos);
		} catch (error) {
			console.error('Error loading repositories:', error);
		}
	}

	$effect(() => {
		if (data.user) {
			initGitHubConfig();
		}
	});
</script>

{#if data.user}
	<Sidebar.Provider bind:open={sidebarOpen}>
		<Sidebar.Root>
			<Sidebar.Header>
				<div class="flex items-center gap-2">
					<img
						src={data.user.user_metadata.avatar_url}
						alt="Profile"
						class="h-8 w-8 rounded-full"
					/>
					<span class="font-medium">{data.user.user_metadata.name}</span>
				</div>
			</Sidebar.Header>

			<Sidebar.Content>
				{#if githubConfig}
					<Sidebar.Group>
						<Sidebar.GroupLabel>Repositories</Sidebar.GroupLabel>
						<Sidebar.Menu>
							{#each $repositories as repo}
								<Sidebar.MenuItem>
									<Sidebar.MenuButton
										isActive={$currentRepository?.id === repo.id}
										onclick={() => currentRepository.set(repo)}
									>
										{repo.name}
									</Sidebar.MenuButton>
								</Sidebar.MenuItem>
							{/each}
						</Sidebar.Menu>
					</Sidebar.Group>
				{:else}
					<div class="p-4 text-sm text-muted-foreground">Loading GitHub configuration...</div>
				{/if}
			</Sidebar.Content>

			<Sidebar.Footer>
				<Button
					class="w-full"
					disabled={!githubConfig}
					onclick={() => {
						showUploadDialog = true;
					}}
				>
					Create Repository
				</Button>
			</Sidebar.Footer>
		</Sidebar.Root>

		<Sidebar.Inset>
			{@render children()}
		</Sidebar.Inset>
	</Sidebar.Provider>
{:else}
	{@render children()}
{/if}
