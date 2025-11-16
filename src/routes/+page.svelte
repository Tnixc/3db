<script lang="ts">
	import FileBrowser from '$lib/components/file-browser.svelte';
	import FileUploadDialog from '$lib/components/file-upload-dialog.svelte';
	import TokenLogin from '$lib/components/token-login.svelte';
	import { Button } from '$lib/components/ui/button';
	import Icon from '@iconify/svelte';
	import { currentRepository } from '$lib/stores/repositories';
	import { authStore } from '$lib/stores/auth';

	let currentPath = $state('');
	let uploadDialogOpen = $state(false);
	let refreshFiles: (() => Promise<void>) | undefined = $state();

	function handleNavigate(path: string) {
		currentPath = path;
	}

	async function handleUploadComplete() {
		// Directly reload files using the exposed loadFiles function
		if (refreshFiles) {
			await refreshFiles();
		}
	}
</script>

{#if $authStore.status === 'logged_out' || $authStore.status === 'logging_in'}
	<TokenLogin />
{:else if $currentRepository}
	<div class="mb-4 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">File Browser</h1>
			<p class="text-sm text-muted-foreground">
				Browse and manage files in {$currentRepository.name}
			</p>
		</div>
		<Button onclick={() => (uploadDialogOpen = true)}>
			<Icon icon="lucide:upload" class="mr-2 size-4" />
			Upload Files
		</Button>
	</div>

	<FileBrowser bind:currentPath bind:onRefresh={refreshFiles} onNavigate={handleNavigate} />

	<FileUploadDialog
		bind:open={uploadDialogOpen}
		{currentPath}
		onUploadComplete={handleUploadComplete}
	/>
{:else}
	<div class="flex min-h-[calc(100vh-8rem)] items-center justify-center">
		<div class="text-center">
			<Icon icon="lucide:database" class="mx-auto mb-4 size-16 text-muted-foreground" />
			<h2 class="mb-2 text-2xl font-semibold">No Repository Selected</h2>
			<p class="text-muted-foreground">
				Select a repository from the sidebar or create a new one to get started
			</p>
		</div>
	</div>
{/if}
