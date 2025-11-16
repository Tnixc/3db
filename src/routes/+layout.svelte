<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { authStore, user } from '$lib/stores/auth';
	import { initializeApp, resetInitialization } from '$lib/services/init';
	import { currentRepository, repositories } from '$lib/stores/repositories';
	// import RepoContextMenu from '$lib/components/repo-context-menu.svelte';
	// import UserMenu from '$lib/components/user-menu.svelte';
	// import CreateRepoDialog from '$lib/components/create-repo-dialog.svelte';
	// import FileUploadDialog from '$lib/components/file-upload-dialog.svelte';
	// import * as Sidebar from '$lib/components/ui/sidebar';
	// import { Button } from '$lib/components/ui/button';
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
				console.log('[Layout] Starting initialization...');
				initializeApp(state.token, state.user.login, state.user.email).catch((error) => {
					console.error('[Layout] Initialization failed:', error);
					// Don't need to call setError here - initializeApp already does it
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
			<button class="px-4 py-2 bg-primary text-primary-foreground rounded" onclick={() => window.location.reload()}>Retry</button>
			<button class="ml-2 px-4 py-2 bg-transparent rounded" onclick={handleSignOut}>Logout</button>
		</div>
	</div>
{:else if $authStore.status === 'ready'}
	<div class="flex h-screen items-center justify-center">
		<div class="text-center">
			<h2 class="mb-2 text-xl font-semibold">App Ready</h2>
			<p class="mb-4 text-muted-foreground">UI components have been removed. Please reinstall shadcn-svelte components.</p>
			<p class="text-sm text-muted-foreground">User: {$user?.login}</p>
			<p class="text-sm text-muted-foreground">Repositories: {$repositories.length}</p>
			<button class="mt-4 px-4 py-2 bg-transparent rounded" onclick={handleSignOut}>Logout</button>
		</div>
	</div>
{/if}
