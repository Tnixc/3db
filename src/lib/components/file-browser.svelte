<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as github from '$lib/services/github';
	import { formatBytes } from '$lib/utils';
	import type { FileContent } from '$lib/types';
	import { currentRepository } from '$lib/stores/repositories';
	import type { GitHubConfig } from '$lib/services/github';
	import Icon from '@iconify/svelte';
	import { useSidebar } from '$lib/components/ui/sidebar';

	let { config } = $props<{ config: GitHubConfig }>();

	const sidebar = useSidebar();

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
			window.open(item.download_url, '_blank');
		}
	}

	let copiedItems = $state(new Set<string>());

		function handleCopyUrl(item: FileContent) {
			navigator.clipboard.writeText(item.download_url);
			
			// Add the item to copied set
			copiedItems.add(item.path);

			// Remove the item after 3 seconds
			setTimeout(() => {
				copiedItems.delete(item.path);
				// Force a reactive update since we're mutating a Set
				copiedItems = new Set(copiedItems);
			}, 3000);
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
		if (!currentPath) return [{ name: $currentRepository?.name ?? 'root', path: '' }];
		return [
			{ name: $currentRepository?.name ?? 'root', path: '' },
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

<div class="space-y-4">
	{#if $currentRepository}
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Button variant="ghost" size="icon" onclick={sidebar.toggle}>
					<Icon icon="lucide:panel-left" class="scale-[1.15]" />
					<span class="sr-only">Toggle Sidebar</span>
				</Button>

				{#each getBreadcrumbs() as crumb}
					<Button variant="ghost" size="sm" onclick={() => loadContents(crumb.path)}>
						{crumb.name}
					</Button>
					{#if crumb.path !== getBreadcrumbs().slice(-1)[0].path}
						<span>/</span>
					{/if}
				{/each}
			</div>
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
					<thead class="bg-accent/50">
						<tr class="border-b">
							<th class="p-2 text-left">Name</th>
							<th class="p-2 text-left">Size</th>
							<th class="p-2 text-right">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each contents.toSorted((a, b) => {
							if (a.type === 'dir' && b.type !== 'dir') return -1;
							if (b.type === 'dir' && a.type !== 'dir') return 1;
							return a.name.localeCompare(b.name);
						}) as item}
							<tr class="border-b border-border/40 last:border-0 hover:bg-accent">
								<td class="px-2">
									<Button variant="link" class="group px-0" onclick={() => handleItemClick(item)}>
										{#if item.type === 'dir'}
											<Icon icon="lucide:folder" class="scale-[1.15]" />
										{:else}
											<Icon icon="lucide:file" class="scale-[1.15]" />
										{/if}
										{item.name}
										{#if item.type === 'dir'}
											<Icon
												icon="lucide:chevron-right"
												class="-translate-x-1/2 scale-[1.15] opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"
											/>
										{:else}
											<Icon
												icon="lucide:external-link"
												class="-translate-x-1/2 scale-[1.05] opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"
											/>
										{/if}
									</Button>
								</td>
								<td class="px-2 text-sm">
									{item.type === 'dir' ? '--' : formatBytes(item.size)}
								</td>
								<td class="px-2 pr-[3.5px] text-right">
									{#if item.type === 'file'}
										<div class="flex items-center justify-end gap-1">
											<Button
												variant="outline"
												class="w-9 group-hover:bg-secondary/20"
												size="sm"
												onclick={() => handleCopyUrl(item)}
											>
												<Icon icon="lucide:copy" class="scale-[1.05]" />
											</Button>
											<Button
												variant="outline"
												size="sm"
												class="w-9 hover:bg-destructive group-hover:bg-destructive/20"
												onclick={() => handleDelete(item)}
											>
												<Icon icon="lucide:trash" class="scale-[1.05]" />
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
