<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { authStore } from '$lib/stores/auth';
	import { initializeApp, resetInitialization } from '$lib/services/init';
	import { currentRepository } from '$lib/stores/repositories';
	import CreateRepoDialog from '$lib/components/create-repo-dialog.svelte';
	import ModeToggle from '$lib/components/mode-toggle.svelte';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Button } from '$lib/components/ui/button';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import AlertCircle from 'lucide-svelte/icons/alert-circle';
	import Database from 'lucide-svelte/icons/database';
	import ExternalLink from 'lucide-svelte/icons/external-link';
	import type { Snippet } from 'svelte';

	let { children } = $props<{ children: Snippet }>();

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

	function handleCreateRepo() {
		createRepoDialogOpen = true;
	}
</script>

<ModeWatcher />

{#if $authStore.status === 'logged_out' || $authStore.status === 'logging_in'}
	{@render children()}
{:else if $authStore.status === 'logged_in' || $authStore.status === 'initializing'}
	<div class="flex h-screen items-center justify-center">
		<div class="text-center">
			<LoaderCircle class="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
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
			<AlertCircle class="mx-auto mb-4 h-12 w-12 text-destructive" />
			<h2 class="mb-2 text-xl font-semibold">Initialization Error</h2>
			<p class="mb-4 text-muted-foreground">{$authStore.error}</p>
			<Button onclick={() => window.location.reload()}>Retry</Button>
			<Button variant="ghost" class="ml-2" onclick={handleSignOut}>Logout</Button>
		</div>
	</div>
{:else if $authStore.status === 'ready'}
	<Sidebar.Provider>
		<AppSidebar onCreateRepo={handleCreateRepo} onSignOut={handleSignOut} />
		<Sidebar.Inset>
			<!-- Header -->
			<header class="flex h-14 items-center gap-4 border-b px-4 sticky top-0 bg-background z-10">
				<Sidebar.Trigger />
				{#if $currentRepository}
					<div class="flex flex-1 items-center gap-2">
						<Database class="size-4" />
						<span class="font-medium">{$currentRepository.name}</span>
						<Button
							variant="ghost"
							size="icon"
							class="h-7 w-7"
							onclick={() => window.open(`https://github.com/${$currentRepository.owner.login}/${$currentRepository.name}`, '_blank')}
						>
							<ExternalLink class="size-3.5" />
							<span class="sr-only">Open on GitHub</span>
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
		</Sidebar.Inset>
	</Sidebar.Provider>

	<!-- Dialogs -->
	<CreateRepoDialog bind:open={createRepoDialogOpen} />
{/if}
