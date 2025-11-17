<script lang="ts">
	import type { FileContent } from '$lib/types';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import Edit from 'lucide-svelte/icons/edit';

	let {
		open = $bindable(false),
		file = $bindable<FileContent | null>(null),
		onRename
	}: {
		open?: boolean;
		file?: FileContent | null;
		onRename: (file: FileContent, newName: string) => Promise<void>;
	} = $props();

	let newName = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleRename() {
		if (!file || !newName.trim() || newName === file.name) return;

		loading = true;
		error = null;

		try {
			await onRename(file, newName.trim());
			// Reset and close
			newName = '';
			open = false;
		} catch (err: any) {
			console.error('Failed to rename:', err);
			error = err.message || 'Failed to rename item';
		} finally {
			loading = false;
		}
	}

	function handleOpenChange(newOpen: boolean) {
		open = newOpen;
		if (newOpen && file) {
			// Set initial value when opening
			newName = file.name;
			error = null;
		} else if (!newOpen) {
			// Reset form when closing
			newName = '';
			error = null;
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Rename {file?.type === 'dir' ? 'Folder' : 'File'}</Dialog.Title>
			<Dialog.Description>
				Enter a new name for {file?.name}
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="new-name">New Name</Label>
				<Input
					id="new-name"
					bind:value={newName}
					placeholder={file?.name}
					disabled={loading}
					oninput={() => {
						error = null;
					}}
					onkeydown={(e) => {
						if (e.key === 'Enter') handleRename();
					}}
				/>
				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)} disabled={loading}>Cancel</Button>
			<Button onclick={handleRename} disabled={loading || !newName.trim() || newName === file?.name}>
				{#if loading}
					<LoaderCircle class="mr-2 size-4 animate-spin" />
					Renaming...
				{:else}
					<Edit class="mr-2 size-4" />
					Rename
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
