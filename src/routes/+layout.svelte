<script lang="ts">
	import '../app.css';
	import { theme } from '$lib/stores/theme';
	import { appState } from '$lib/stores/auth';
	import { PUBLIC_GITHUB_APP_NAME } from '$env/static/public';
	import RepoContextMenu from '$lib/components/repo-context-menu.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Button } from '$lib/components/ui/button';
	import type { Snippet } from 'svelte';
	import { currentRepository, repositories } from '$lib/stores/repositories';
	import UserMenu from '$lib/components/user-menu.svelte';
	import CreateRepoDialog from '$lib/components/create-repo-dialog.svelte';
	import FileUploadDialog from '$lib/components/file-upload-dialog.svelte';
	import GithubAppPrompt from '$lib/components/github-app-prompt.svelte';
	import Icon from '@iconify/svelte';
	import * as github from '$lib/services/github';
	import * as service from '$lib/services/service';
	import { serviceConfig } from '$lib/stores/service-config';
	import { needsReload } from '$lib/stores/reload';

	let { children } = $props<{
		children: Snippet;
	}>();

	let sidebarOpen = $state(true);
	let githubConfig: github.GitHubConfig | null = $state(null);
	let currentPath = $state('');
	let createRepoDialogOpen = $state(false);
	let uploadDialogOpen = $state(false);

	const state = $derived($appState);

	// Single initialization effect - runs ONCE when status becomes 'initializing'
	$effect(() => {
		if (state.status === 'initializing') {
			initialize(state.token, state.user);
		} else if (state.status === 'unauthenticated') {
			// Reset on logout
			githubConfig = null;
			repositories.set([]);
		}
	});

	async function initialize(token: string, user: typeof state extends { user: infer U } ? U : never) {
		try {
			// Create GitHub config
			githubConfig = {
				token,
				userEmail: user.email
			};

			// Check if GitHub app is installed
			const response = await fetch('/api/github/check-installation', {
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				}
			});

			const { installed } = await response.json();

			if (!installed) {
				// Mark ready but without GitHub app
				appState.markReady(false, token, user);
				return;
			}

			// Initialize service repository
			await service.initializeServiceRepo(githubConfig);

			// Load service config and repositories
			const config = await service.getServiceConfig(githubConfig);
			serviceConfig.set(config);

			const allRepos = await github.getRepositories(githubConfig);
			const connectedRepos = allRepos.filter((repo) =>
				config.connectedRepos.includes(repo.full_name)
			);
			repositories.set(connectedRepos);

			// Mark as ready
			appState.markReady(true, token, user);
		} catch (error) {
			console.error('Initialization error:', error);
			const errorMsg = error instanceof Error ? error.message : 'Initialization failed';
			appState.setError(errorMsg);
		}
	}

	function handleCreateRepoOpenChange(open: boolean) {
		createRepoDialogOpen = open;
	}

	function handleUploadDialogOpenChange(open: boolean) {
		uploadDialogOpen = open;
	}

	async function loadCurrentDirectory() {
		if (!githubConfig || !$currentRepository) return;
		try {
			await github.getContents(
				githubConfig,
				$currentRepository.owner.login,
				$currentRepository.name,
				currentPath
			);
		} catch (error) {
			console.error('Error reloading directory:', error);
		}
	}

	function signOut() {
		appState.logout();
	}
</script>

{#if state.status === 'unauthenticated' || state.status === 'logging_in' || state.status === 'error'}
	{@render children()}
{:else if state.status === 'initializing'}
	<div class="flex h-screen items-center justify-center">
		<div class="text-center">
			<Icon icon="lucide:loader-2" class="mx-auto h-12 w-12 animate-spin text-primary" />
			<p class="mt-4 text-lg font-medium">Setting up your workspace...</p>
			<p class="mt-2 text-sm text-muted-foreground">
				Creating service repository and loading your data
			</p>
		</div>
	</div>
{:else if state.status === 'ready'}
	{#if !state.hasGithubApp}
		<GithubAppPrompt
			installationUrl={`https://github.com/apps/${PUBLIC_GITHUB_APP_NAME}/installations/new`}
		/>
	{:else}
		<Sidebar.Provider bind:open={sidebarOpen}>
			<Sidebar.Root>
				<Sidebar.Header>
					<UserMenu user={state.user} onSignOut={signOut} />
				</Sidebar.Header>

				<Sidebar.Content>
					{#if githubConfig}
						<Sidebar.Group>
							<Sidebar.GroupLabel>Repositories</Sidebar.GroupLabel>
							<Sidebar.Menu>
								{#each $repositories as repo}
									<Sidebar.MenuItem>
										<RepoContextMenu repository={repo} config={githubConfig}>
											<Sidebar.MenuButton
												class="relative whitespace-nowrap after:absolute after:right-0 after:h-full after:w-6 after:bg-gradient-to-r after:from-transparent after:to-sidebar"
												isActive={$currentRepository?.id === repo.id}
												onclick={() => currentRepository.set(repo)}
											>
												<Icon icon="lucide:database" class="mr-2 h-4 w-4" />
												{repo.name}
											</Sidebar.MenuButton>
										</RepoContextMenu>
									</Sidebar.MenuItem>
								{/each}
							</Sidebar.Menu>
						</Sidebar.Group>
					{:else}
						<div class="p-4 text-sm text-muted-foreground">Loading repositories...</div>
					{/if}
				</Sidebar.Content>

				<Sidebar.Footer>
					{#if $needsReload}
						<div class="bg-destructive/10 p-2">
							<Icon icon="lucide:triangle-alert" class="text-destructive" />
							<p class="text-sm">Reload to see changes. You may need to wait a few seconds.</p>
						</div>
					{/if}
					<Button
						class="w-full"
						onclick={() => (uploadDialogOpen = true)}
						disabled={!$currentRepository}
					>
						<Icon icon="lucide:upload" class="mr-2 h-4 w-4" />
						Upload File
					</Button>
					<Button variant="outline" size="sm" onclick={() => (createRepoDialogOpen = true)}>
						<Icon icon="lucide:plus" class="mr-2 h-4 w-4" />
						Link or Create Repo
					</Button>
				</Sidebar.Footer>
			</Sidebar.Root>

			<Sidebar.Inset>
				{@render children()}

				{#if githubConfig}
					<CreateRepoDialog
						bind:open={createRepoDialogOpen}
						onOpenChange={handleCreateRepoOpenChange}
						config={githubConfig}
					/>

					<FileUploadDialog
						bind:open={uploadDialogOpen}
						onOpenChange={handleUploadDialogOpenChange}
						config={githubConfig}
						{currentPath}
						onUploadComplete={loadCurrentDirectory}
					/>
				{/if}
			</Sidebar.Inset>
		</Sidebar.Provider>
	{/if}
{/if}
