<script lang="ts">
	import type { FileContent } from '$lib/types';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import Trash from 'lucide-svelte/icons/trash';

	let {
		open = $bindable(false),
		file = $bindable<FileContent | null>(null),
		onDelete
	}: {
		open?: boolean;
		file?: FileContent | null;
		onDelete: (file: FileContent) => Promise<void>;
	} = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleDelete() {
		if (!file) return;

		loading = true;
		error = null;

		try {
			await onDelete(file);
			// Reset and close
			open = false;
		} catch (err: any) {
			console.error('Failed to delete:', err);
			error = err.message || 'Failed to delete item';
		} finally {
			loading = false;
		}
	}

	function handleOpenChange(newOpen: boolean) {
		open = newOpen;
		if (!newOpen) {
			// Reset form when closing
			error = null;
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Delete {file?.type === 'dir' ? 'Folder' : 'File'}</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete <strong>{file?.name}</strong>?
				<br /><br />
				<strong>Warning:</strong> Even after deletion, this {file?.type === 'dir' ? 'folder' : 'file'} will remain in the repository's commit history and can be recovered. Files uploaded to Git are never truly deleted.
			</Dialog.Description>
		</Dialog.Header>
		{#if error}
			<div class="py-2">
				<p class="text-sm text-destructive">{error}</p>
			</div>
		{/if}
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)} disabled={loading}>Cancel</Button>
			<Button variant="destructive" onclick={handleDelete} disabled={loading}>
				{#if loading}
					<LoaderCircle class="mr-2 size-4 animate-spin" />
					Deleting...
				{:else}
					<Trash class="mr-2 size-4" />
					Delete
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
