<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { authStore, user } from '$lib/stores/auth';
	import { initializeApp, resetInitialization, recheckInstallation } from '$lib/services/init';
	import { PUBLIC_GITHUB_APP_NAME } from '$env/static/public';
	import { currentRepository, repositories } from '$lib/stores/repositories';
	import RepoContextMenu from '$lib/components/repo-context-menu.svelte';
	import UserMenu from '$lib/components/user-menu.svelte';
	import CreateRepoDialog from '$lib/components/create-repo-dialog.svelte';
	import FileUploadDialog from '$lib/components/file-upload-dialog.svelte';
	import GithubAppPrompt from '$lib/components/github-app-prompt.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Button } from '$lib/components/ui/button';
	import Icon from '@iconify/svelte';
	import type { Snippet } from 'svelte';
	import type { GitHubConfig } from '$lib/services/github';

	let { children } = $props<{ children: Snippet }>();

	let sidebarOpen = $state(true);
	let createRepoDialogOpen = $state(false);
	let uploadDialogOpen = $state(false);
	let currentPath = $state('');

	let githubConfig = $derived.by(() => {
		const state = $authStore;
		if (state.status === 'ready' || state.status === 'initializing' || state.status === 'error') {
			return { token: state.token, userEmail: state.user.email } as GitHubConfig;
		}
		return null;
	});

	// Initialize app when user logs in
	onMount(() => {
		const unsubscribe = authStore.subscribe((state) => {
			if (state.status === 'logged_in') {
				// User just logged in, start initialization
				initializeApp(state.token, state.user.login, state.user.email).catch((error) => {
					console.error('[Layout] Initialization failed:', error);
				});
			}
		});

		return unsubscribe;
	});

	function handleSignOut() {
		resetInitialization();
		authStore.logout();
	}

	async function loadCurrentDirectory() {
		// Placeholder for future implementation
	}

	async function handleRefreshInstallation() {
		const state = $authStore;
		if (state.status === 'ready') {
			await recheckInstallation(state.token);
		}
	}
</script>

{#if $authStore.status === 'logged_out' || $authStore.status === 'logging_in'}
	{@render children()}
{:else if $authStore.status === 'logged_in' || $authStore.status === 'initializing'}
	<div class="flex h-screen items-center justify-center">
		<div class="text-center">
			<Icon icon="lucide:loader-2" class="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
			<h2 class="mb-2 text-xl font-semibold">Setting up your workspace</h2>
			<p class="text-muted-foreground">
				{#if $authStore.status === 'logged_in'}
					Starting initialization...
				{:else}
					Creating service repository and loading data...
				{/if}
			</p>
			<p class="mt-2 text-sm text-muted-foreground">This may take 15-30 seconds</p>
		</div>
	</div>
{:else if $authStore.status === 'error'}
	<div class="flex h-screen items-center justify-center">
		<div class="max-w-md text-center">
			<Icon icon="lucide:alert-circle" class="mx-auto mb-4 h-12 w-12 text-destructive" />
			<h2 class="mb-2 text-xl font-semibold">Initialization Error</h2>
			<p class="mb-4 text-muted-foreground">{$authStore.error}</p>
			<Button onclick={() => window.location.reload()}>Retry</Button>
			<Button variant="ghost" onclick={handleSignOut} class="ml-2">Logout</Button>
		</div>
	</div>
{:else if $authStore.status === 'ready'}
	{#if !$authStore.hasGithubApp}
		<GithubAppPrompt
			installationUrl={`https://github.com/apps/${PUBLIC_GITHUB_APP_NAME}/installations/new`}
			onRefresh={handleRefreshInstallation}
		/>
	{:else}
		<Sidebar.Provider bind:open={sidebarOpen}>
			<Sidebar.Root>
				<Sidebar.Header>
					{#if $user}
						<UserMenu user={$user} onSignOut={handleSignOut} />
					{/if}
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
					{/if}
				</Sidebar.Content>

				<Sidebar.Footer>
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
					<CreateRepoDialog bind:open={createRepoDialogOpen} config={githubConfig} />

					<FileUploadDialog
						bind:open={uploadDialogOpen}
						config={githubConfig}
						{currentPath}
						onUploadComplete={loadCurrentDirectory}
					/>
				{/if}
			</Sidebar.Inset>
		</Sidebar.Provider>
	{/if}
{/if}
