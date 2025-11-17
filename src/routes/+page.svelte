<script lang="ts">
	import FileBrowser from '$lib/components/file-browser.svelte';
	import FileUploadDialog from '$lib/components/file-upload-dialog.svelte';
	import TokenLogin from '$lib/components/token-login.svelte';
	import Database from 'lucide-svelte/icons/database';
	import { currentRepository } from '$lib/stores/repositories';
	import { authStore } from '$lib/stores/auth';

	let currentPath = $state('');
	let uploadDialogOpen = $state(false);

	function handleNavigate(path: string) {
		currentPath = path;
	}

	function handleUploadComplete() {
		// Trigger re-render of file browser by updating the path
		const temp = currentPath;
		currentPath = '';
		setTimeout(() => {
			currentPath = temp;
		}, 100);
	}
</script>

{#if $authStore.status === 'logged_out' || $authStore.status === 'logging_in'}
	<TokenLogin />
{:else if $currentRepository}
	<FileBrowser
		bind:currentPath
		onNavigate={handleNavigate}
		onUpload={() => (uploadDialogOpen = true)}
	/>

	<FileUploadDialog
		bind:open={uploadDialogOpen}
		{currentPath}
		onUploadComplete={handleUploadComplete}
	/>
{:else}
	<div class="flex min-h-[calc(100vh-8rem)] items-center justify-center">
		<div class="text-center">
			<Database class="mx-auto mb-4 size-16 text-muted-foreground" />
			<h2 class="mb-2 text-2xl font-semibold">No Repository Selected</h2>
			<p class="text-muted-foreground">
				Select a repository from the sidebar or create a new one to get started
			</p>
		</div>
	</div>
{/if}
