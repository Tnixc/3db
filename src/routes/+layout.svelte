<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { authStore, user } from '$lib/stores/auth';
	import { initializeApp, resetInitialization } from '$lib/services/init';
	import { currentRepository, repositories } from '$lib/stores/repositories';
	import RepoContextMenu from '$lib/components/repo-context-menu.svelte';
	import UserMenu from '$lib/components/user-menu.svelte';
	import CreateRepoDialog from '$lib/components/create-repo-dialog.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Button } from '$lib/components/ui/button';
	import Icon from '@iconify/svelte';
	import type { Snippet } from 'svelte';

	let { children } = $props<{ children: Snippet }>();

	let sidebarOpen = $state(true);
	let createRepoDialogOpen = $state(false);

	// Initialize app when user logs in
	onMount(() => {
		const unsubscribe = authStore.subscribe((state) => {
			if (state.status === 'logged_in') {
				console.log('[Layout] Starting initialization...');
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
			<Button variant="ghost" class="ml-2" onclick={handleSignOut}>Logout</Button>
		</div>
	</div>
{:else if $authStore.status === 'ready'}
	<Sidebar.Provider bind:open={sidebarOpen}>
		<div class="flex h-screen w-full">
			<!-- Sidebar -->
			<Sidebar.Sidebar>
				<Sidebar.Header>
					<div class="flex items-center justify-between px-2">
						<h2 class="text-lg font-semibold">3db</h2>
						<UserMenu onSignOut={handleSignOut} />
					</div>
				</Sidebar.Header>
				<Sidebar.Content>
					<Sidebar.Group>
						<Sidebar.GroupLabel>Repositories</Sidebar.GroupLabel>
						<Sidebar.GroupContent>
							<Sidebar.Menu>
								{#each $repositories as repo (repo.id)}
									<Sidebar.MenuItem>
										<Sidebar.MenuButton
											onclick={() => currentRepository.set(repo)}
											isActive={$currentRepository?.id === repo.id}
										>
											<Icon icon="lucide:database" class="mr-2 size-4" />
											<span class="flex-1 truncate">{repo.name}</span>
										</Sidebar.MenuButton>
										<Sidebar.MenuAction>
											<RepoContextMenu {repo} />
										</Sidebar.MenuAction>
									</Sidebar.MenuItem>
								{:else}
									<p class="px-2 py-4 text-center text-sm text-muted-foreground">
										No repositories yet
									</p>
								{/each}
							</Sidebar.Menu>
						</Sidebar.GroupContent>
					</Sidebar.Group>
				</Sidebar.Content>
				<Sidebar.Footer class="p-2">
					<Button class="w-full" onclick={() => (createRepoDialogOpen = true)}>
						<Icon icon="lucide:plus" class="mr-2 size-4" />
						New Repository
					</Button>
				</Sidebar.Footer>
			</Sidebar.Sidebar>

			<!-- Main Content -->
			<div class="flex flex-1 flex-col overflow-hidden">
				<!-- Header -->
				<header class="border-b">
					<div class="flex h-14 items-center gap-4 px-4">
						<Sidebar.Trigger />
						{#if $currentRepository}
							<div class="flex flex-1 items-center gap-2">
								<Icon icon="lucide:database" class="size-4" />
								<span class="font-medium">{$currentRepository.name}</span>
								<span class="text-sm text-muted-foreground">
									by {$currentRepository.owner.login}
								</span>
							</div>
						{:else}
							<span class="text-muted-foreground">Select a repository to get started</span>
						{/if}
					</div>
				</header>

				<!-- Page Content -->
				<main class="flex-1 overflow-auto p-4">
					{@render children()}
				</main>
			</div>
		</div>

		<!-- Dialogs -->
		<CreateRepoDialog bind:open={createRepoDialogOpen} />
	</Sidebar.Provider>
{/if}
