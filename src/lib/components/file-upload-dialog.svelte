<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import Icon from '@iconify/svelte';
	import { createFile, getContents } from '$lib/services/github';
	import { authStore } from '$lib/stores/auth';
	import { currentRepository } from '$lib/stores/repositories';
	import type { FileContent } from '$lib/types';

	let {
		open = $bindable(false),
		currentPath = '',
		onUploadComplete
	}: {
		open?: boolean;
		currentPath?: string;
		onUploadComplete?: () => void;
	} = $props();

	let files = $state<FileList | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let uploadProgress = $state<string>('');

	async function handleUpload() {
		if (!files || files.length === 0) {
			error = 'Please select at least one file';
			return;
		}

		if (!$currentRepository || $authStore.status !== 'ready') return;

		loading = true;
		error = null;

		try {
			const config = { token: $authStore.token, userEmail: $authStore.user.email };
			const fileArray = Array.from(files);

			for (let i = 0; i < fileArray.length; i++) {
				const file = fileArray[i];
				uploadProgress = `Uploading ${i + 1}/${fileArray.length}: ${file.name}`;

				const path = currentPath ? `${currentPath}/${file.name}` : file.name;
				const content = await file.arrayBuffer();

				// Check if file already exists to get its SHA
				let sha: string | undefined;
				try {
					const existingFile = await getContents(
						config,
						$currentRepository.owner.login,
						$currentRepository.name,
						path
					);
					// If it's a file (not a directory), get the SHA
					if (!Array.isArray(existingFile)) {
						const fileData = existingFile as FileContent;
						sha = fileData.sha;
					}
				} catch (err: any) {
					// File doesn't exist (404), which is fine - we'll create it
					if (err.status !== 404) {
						throw err; // Re-throw if it's not a 404 error
					}
				}

				await createFile(
					config,
					$currentRepository.owner.login,
					$currentRepository.name,
					path,
					content,
					sha ? `Update ${file.name}` : `Add ${file.name}`,
					sha
				);
			}

			// Reset and close
			files = null;
			open = false;
			onUploadComplete?.();
		} catch (err: any) {
			console.error('Failed to upload files:', err);
			error = err.message || 'Failed to upload files';
		} finally {
			loading = false;
			uploadProgress = '';
		}
	}

	function handleOpenChange(newOpen: boolean) {
		open = newOpen;
		if (!newOpen) {
			// Reset form when closing
			files = null;
			error = null;
			uploadProgress = '';
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Upload Files</Dialog.Title>
			<Dialog.Description>
				Upload files to {currentPath || 'root folder'} in {$currentRepository?.name}
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="file-input">Select Files</Label>
				<Input
					id="file-input"
					type="file"
					multiple
					disabled={loading}
					onchange={(e) => {
						files = e.currentTarget.files;
					}}
				/>
				{#if files && files.length > 0}
					<p class="text-sm text-muted-foreground">{files.length} file(s) selected</p>
				{/if}
				{#if uploadProgress}
					<p class="text-sm text-primary">{uploadProgress}</p>
				{/if}
				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)} disabled={loading}>Cancel</Button>
			<Button onclick={handleUpload} disabled={loading || !files || files.length === 0}>
				{#if loading}
					<Icon icon="lucide:loader-2" class="mr-2 size-4 animate-spin" />
					Uploading...
				{:else}
					<Icon icon="lucide:upload" class="mr-2 size-4" />
					Upload
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
