<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as github from '$lib/services/github';
	import type { FileContent, Repository } from '$lib/types';
	import { currentRepository } from '$lib/stores/repositories';
	import type { GitHubConfig } from '$lib/services/github';
	import FileUploadDialog from './file-upload-dialog.svelte';

	let { config } = $props<{ config: GitHubConfig }>();

	let showUploadDialog = $state(false);

	let currentPath = $state('');
	let contents = $state<FileContent[]>([]);
	let error = $state<string | null>(null);
	let loading = $state(false);

	async function loadContents(path = '') {
		if (!$currentRepository) return;

		loading = true;
		error = null;

		try {
			contents = await github.getContents(
				config,
				$currentRepository.owner.login,
				$currentRepository.name,
				path
			);
			currentPath = path;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load contents';
			contents = [];
		} finally {
			loading = false;
		}
	}

	function handleItemClick(item: FileContent) {
		if (item.type === 'dir') {
			loadContents(item.path);
		} else {
			// Copy raw URL to clipboard
			navigator.clipboard.writeText(item.download_url);
		}
	}

	function handleCopyUrl(item: FileContent) {
		navigator.clipboard.writeText(item.download_url);
	}

	async function handleDelete(item: FileContent) {
		if (!$currentRepository || !confirm(`Delete ${item.name}?`)) return;

		try {
			await github.deleteFile(
				config,
				$currentRepository.owner.login,
				$currentRepository.name,
				item.path,
				item.sha
			);
			await loadContents(currentPath);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete file';
		}
	}

	function getBreadcrumbs() {
		if (!currentPath) return [{ name: 'root', path: '' }];
		return [
			{ name: 'root', path: '' },
			...currentPath.split('/').map((part, index, arr) => ({
				name: part,
				path: arr.slice(0, index + 1).join('/')
			}))
		];
	}

	$effect(() => {
		if ($currentRepository) {
			loadContents();
		} else {
			contents = [];
			currentPath = '';
		}
	});
</script>

<FileUploadDialog
	bind:open={showUploadDialog}
	{config}
	{currentPath}
	onUploadComplete={() => loadContents(currentPath)}
/>

<div class="space-y-4">
	{#if $currentRepository}
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-2">
				{#each getBreadcrumbs() as crumb}
					<Button variant="ghost" size="sm" onclick={() => loadContents(crumb.path)}>
						{crumb.name}
					</Button>
					{#if crumb.path !== getBreadcrumbs().slice(-1)[0].path}
						<span>/</span>
					{/if}
				{/each}
			</div>

			<Button
				onclick={() => {
					/* TODO: Implement file upload */
				}}
			>
				Upload File
			</Button>
		</div>

		{#if loading}
			<div class="py-8 text-center">Loading...</div>
		{:else if error}
			<div class="rounded-md bg-destructive/10 p-4 text-destructive">
				{error}
			</div>
		{:else if contents.length === 0}
			<div class="py-8 text-center text-muted-foreground">This folder is empty</div>
		{:else}
			<div class="rounded-md border">
				<table class="w-full">
					<thead>
						<tr class="border-b">
							<th class="p-2 text-left">Name</th>
							<th class="p-2 text-left">Size</th>
							<th class="p-2 text-right">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each contents as item}
							<tr class="border-b last:border-0">
								<td class="p-2">
									<button
										class="flex items-center gap-2 hover:underline"
										onclick={() => handleItemClick(item)}
									>
										{#if item.type === 'dir'}
											📁
										{:else}
											📄
										{/if}
										{item.name}
									</button>
								</td>
								<td class="p-2">
									{item.type === 'dir' ? '--' : item.size}
								</td>
								<td class="p-2 text-right">
									{#if item.type === 'file'}
										<div class="flex justify-end gap-2">
											<Button variant="outline" size="sm" onclick={() => handleCopyUrl(item)}>
												Copy URL
											</Button>
											<Button variant="destructive" size="sm" onclick={() => handleDelete(item)}>
												Delete
											</Button>
										</div>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{:else}
		<div class="py-8 text-center text-muted-foreground">
			Select a repository to view its contents
		</div>
	{/if}
</div>
