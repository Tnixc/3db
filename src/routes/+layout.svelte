<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { authStore } from '$lib/stores/auth';
	import { initializeApp, resetInitialization } from '$lib/services/init';
	import { currentRepository, repositories } from '$lib/stores/repositories';
	import CreateRepoDialog from '$lib/components/create-repo-dialog.svelte';
	import UserMenu from '$lib/components/user-menu.svelte';
	import RepoContextMenu from '$lib/components/repo-context-menu.svelte';
	import ModeToggle from '$lib/components/mode-toggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as ScrollArea from '$lib/components/ui/scroll-area';
	import Icon from '@iconify/svelte';
	import type { Snippet } from 'svelte';

	let { children } = $props<{ children: Snippet }>();

	let createRepoDialogOpen = $state(false);
	let sidebarOpen = $state(true);

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

	function handleCreateRepo() {
		createRepoDialogOpen = true;
	}

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}
</script>

<ModeWatcher />

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
	<div class="flex h-screen overflow-hidden">
		<!-- Sidebar - Toggleable -->
		{#if sidebarOpen}
		<aside class="flex w-64 flex-col border-r bg-background transition-all duration-300">
			<!-- Sidebar Header -->
			<div class="flex h-14 items-center justify-between border-b px-4">
				<h2 class="text-lg font-semibold">3db</h2>
				<UserMenu onSignOut={handleSignOut} />
			</div>

			<!-- Repositories List -->
			<ScrollArea.Root class="flex-1">
				<div class="p-4">
					<div class="mb-2 flex items-center justify-between">
						<h3 class="text-sm font-medium text-muted-foreground">Repositories</h3>
					</div>
					<div class="space-y-1">
						{#each $repositories as repo (repo.id)}
							<div class="group relative">
								<Button
									variant={$currentRepository?.id === repo.id ? 'secondary' : 'ghost'}
									class="w-full justify-start"
									onclick={() => currentRepository.set(repo)}
								>
									<Icon icon="lucide:database" class="mr-2 size-4" />
									<span class="flex-1 truncate text-left">{repo.name}</span>
								</Button>
								<div
									class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
								>
									<RepoContextMenu {repo} />
								</div>
							</div>
						{:else}
							<p class="py-8 text-center text-sm text-muted-foreground">No repositories yet</p>
						{/each}
					</div>
				</div>
			</ScrollArea.Root>

			<!-- Sidebar Footer -->
			<div class="border-t p-4">
				<Button class="w-full" onclick={handleCreateRepo}>
					<Icon icon="lucide:plus" class="mr-2 size-4" />
					New Repository
				</Button>
			</div>
		</aside>
		{/if}

		<!-- Main Content -->
		<div class="flex flex-1 flex-col overflow-hidden">
			<!-- Header -->
			<header class="flex h-14 items-center gap-4 border-b px-4">
				<Button variant="ghost" size="icon" onclick={toggleSidebar} aria-label="Toggle sidebar">
					<Icon icon={sidebarOpen ? 'lucide:panel-left-close' : 'lucide:panel-left-open'} class="size-5" />
				</Button>
				{#if $currentRepository}
					<div class="flex flex-1 items-center gap-2">
						<Icon icon="lucide:database" class="size-4" />
						<span class="font-medium">{$currentRepository.name}</span>
						<Button
							variant="ghost"
							size="sm"
							class="h-7 gap-1.5 px-2 text-sm"
							onclick={() => window.open(`https://github.com/${$currentRepository.owner.login}/${$currentRepository.name}`, '_blank')}
						>
							<Icon icon="lucide:external-link" class="size-3.5" />
							Open on GitHub
						</Button>
					</div>
				{:else}
					<span class="flex-1 text-muted-foreground">Select a repository to get started</span>
				{/if}
				<ModeToggle />
			</header>

			<!-- Page Content -->
			<main class="flex-1 overflow-auto p-6">
				{@render children()}
			</main>
		</div>
	</div>

	<!-- Dialogs -->
	<CreateRepoDialog bind:open={createRepoDialogOpen} />
{/if}
