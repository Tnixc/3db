<script lang="ts">
	import type { FileContent } from '$lib/types';
	import {
		type ColumnDef,
		type SortingState,
		getCoreRowModel,
		getSortedRowModel
	} from '@tanstack/table-core';
	import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Icon from '@iconify/svelte';
	import { createRawSnippet } from 'svelte';
	import { renderSnippet, renderComponent } from '$lib/components/ui/data-table/index.js';
	import { currentRepository } from '$lib/stores/repositories';
	import { authStore } from '$lib/stores/auth';
	import { getContents, deleteFile, deleteFolder, createFile } from '$lib/services/github';
	import FileActionsMenu from './file-actions-menu.svelte';

	let {
		currentPath = $bindable(''),
		onNavigate
	}: {
		currentPath?: string;
		onNavigate?: (path: string) => void;
	} = $props();

	let files = $state<FileContent[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function loadFiles() {
		if (!$currentRepository || $authStore.status !== 'ready') {
			files = [];
			loading = false;
			return;
		}

		loading = true;
		error = null;

		try {
			const config = { token: $authStore.token, userEmail: $authStore.user.email };
			const contents = await getContents(
				config,
				$currentRepository.owner.login,
				$currentRepository.name,
				currentPath
			);

			// Normalize to array (GitHub returns object for single file, array for directory)
			const contentsArray = Array.isArray(contents) ? contents : [contents];

			// Fetch last modified dates
			const contentsWithDates = await Promise.all(
				contentsArray.map(async (item) => {
					try {
						const response = await fetch(
							`https://api.github.com/repos/${$currentRepository.owner.login}/${$currentRepository.name}/commits?path=${encodeURIComponent(item.path)}&page=1&per_page=1&_=${Date.now()}`,
							{
								headers: {
									Authorization: `Bearer ${$authStore.token}`,
									Accept: 'application/vnd.github.v3+json'
								},
								cache: 'no-store'
							}
						);
						if (response.ok) {
							const commits = await response.json();
							if (commits && commits.length > 0) {
								return {
									...item,
									last_modified: commits[0].commit.committer.date
								};
							}
						}
					} catch (err) {
						console.warn(`Failed to fetch commit date for ${item.path}:`, err);
					}
					return item;
				})
			);

			files = contentsWithDates;
		} catch (err) {
			console.error('Failed to load files:', err);
			error = 'Failed to load files';
			files = [];
		} finally {
			loading = false;
		}
	}

	// Load files when repository or path changes
	$effect(() => {
		if ($currentRepository) {
			loadFiles();
		}
	});

	function navigateTo(path: string) {
		currentPath = path;
		onNavigate?.(path);
	}

	function goUp() {
		const parts = currentPath.split('/').filter(Boolean);
		parts.pop();
		navigateTo(parts.join('/'));
	}

	async function handleDelete(file: FileContent) {
		if (!$currentRepository || $authStore.status !== 'ready') return;

		if (!confirm(`Are you sure you want to delete ${file.name}?`)) return;

		try {
			const config = { token: $authStore.token, userEmail: $authStore.user.email };
			if (file.type === 'dir') {
				await deleteFolder(
					config,
					$currentRepository.owner.login,
					$currentRepository.name,
					file.path
				);
			} else {
				await deleteFile(
					config,
					$currentRepository.owner.login,
					$currentRepository.name,
					file.path,
					file.sha
				);
			}
			await loadFiles();
		} catch (err) {
			console.error('Failed to delete:', err);
			alert('Failed to delete file/folder');
		}
	}

	function copyLink(file: FileContent) {
		if (file.download_url) {
			navigator.clipboard.writeText(file.download_url);
		}
	}

	async function copyContents(file: FileContent) {
		if (file.type === 'dir') return;

		try {
			const response = await fetch(file.download_url);
			const content = await response.text();
			await navigator.clipboard.writeText(content);
		} catch (err) {
			console.error('Failed to copy contents:', err);
			alert('Failed to copy file contents');
		}
	}

	async function handleRename(file: FileContent) {
		const newName = prompt(`Rename ${file.type === 'dir' ? 'folder' : 'file'}:`, file.name);
		if (!newName || newName === file.name) return;

		if (!$currentRepository || $authStore.status !== 'ready') return;

		try {
			const config = { token: $authStore.token, userEmail: $authStore.user.email };
			const pathParts = file.path.split('/');
			pathParts[pathParts.length - 1] = newName;
			const newPath = pathParts.join('/');

			if (file.type === 'file') {
				// For files: download content, create new file, delete old file
				const response = await fetch(file.download_url);
				const content = await response.text();

				await createFile(
					config,
					$currentRepository.owner.login,
					$currentRepository.name,
					newPath,
					content,
					`Rename ${file.name} to ${newName}`
				);

				await deleteFile(
					config,
					$currentRepository.owner.login,
					$currentRepository.name,
					file.path,
					file.sha,
					`Rename ${file.name} to ${newName}`
				);
			} else {
				// For folders: need to recursively move all contents
				alert('Folder renaming is not yet supported. Please use GitHub web interface.');
				return;
			}

			await loadFiles();
		} catch (err) {
			console.error('Failed to rename:', err);
			alert('Failed to rename item');
		}
	}

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	}

	function formatDate(dateString?: string): string {
		if (!dateString) return '-';
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 30) return `${diffDays}d ago`;

		return date.toLocaleDateString();
	}

	const columns: ColumnDef<FileContent>[] = [
		{
			accessorKey: 'name',
			header: ({ column }) => {
				const isSorted = column.getIsSorted();
				const icon = isSorted === 'asc' ? 'lucide:arrow-up' : isSorted === 'desc' ? 'lucide:arrow-down' : 'lucide:arrows-up-down';
				const headerSnippet = createRawSnippet(() => ({
					render: () => `
						<div class="flex items-center gap-2">
							<span>Name</span>
							<iconify-icon icon="${icon}" class="size-4 ${!isSorted ? 'opacity-50' : ''}"></iconify-icon>
						</div>
					`
				}));
				return renderComponent(Button, {
					variant: 'ghost',
					class: '-ml-4 h-auto p-0 hover:bg-transparent font-medium',
					onclick: column.getToggleSortingHandler(),
					children: renderSnippet(headerSnippet)
				});
			},
			cell: ({ row }) => {
				const file = row.original;
				const nameSnippet = createRawSnippet<[{ file: FileContent }]>((getFile) => {
					const { file } = getFile();
					const icon = file.type === 'dir' ? 'lucide:folder' : 'lucide:file';
					const clickHandler = file.type === 'dir' ? `onclick="event.target.closest('button').click()"` : '';
					return {
						render: () => `
							<div class="flex items-center gap-2">
								<iconify-icon icon="${icon}" class="size-4"></iconify-icon>
								<span ${clickHandler}>${file.name}</span>
							</div>
						`
					};
				});
				if (file.type === 'dir') {
					return renderComponent(Button, {
						variant: 'ghost',
						class: 'h-auto p-0 hover:bg-transparent',
						onclick: () => navigateTo(file.path),
						children: renderSnippet(nameSnippet, { file })
					});
				}
				return renderSnippet(nameSnippet, { file });
			}
		},
		{
			accessorKey: 'type',
			header: ({ column }) => {
				const isSorted = column.getIsSorted();
				const icon = isSorted === 'asc' ? 'lucide:arrow-up' : isSorted === 'desc' ? 'lucide:arrow-down' : 'lucide:arrows-up-down';
				const headerSnippet = createRawSnippet(() => ({
					render: () => `
						<div class="flex items-center gap-2">
							<span>Type</span>
							<iconify-icon icon="${icon}" class="size-4 ${!isSorted ? 'opacity-50' : ''}"></iconify-icon>
						</div>
					`
				}));
				return renderComponent(Button, {
					variant: 'ghost',
					class: '-ml-4 h-auto p-0 hover:bg-transparent font-medium',
					onclick: column.getToggleSortingHandler(),
					children: renderSnippet(headerSnippet)
				});
			},
			cell: ({ row }) => {
				const typeSnippet = createRawSnippet<[{ type: string }]>((getType) => {
					const { type } = getType();
					return {
						render: () => `<div class="text-muted-foreground capitalize">${type === 'dir' ? 'Folder' : 'File'}</div>`
					};
				});
				return renderSnippet(typeSnippet, { type: row.original.type });
			}
		},
		{
			accessorKey: 'size',
			header: ({ column }) => {
				const isSorted = column.getIsSorted();
				const icon = isSorted === 'asc' ? 'lucide:arrow-up' : isSorted === 'desc' ? 'lucide:arrow-down' : 'lucide:arrows-up-down';
				const headerSnippet = createRawSnippet(() => ({
					render: () => `
						<div class="flex items-center gap-2">
							<span>Size</span>
							<iconify-icon icon="${icon}" class="size-4 ${!isSorted ? 'opacity-50' : ''}"></iconify-icon>
						</div>
					`
				}));
				return renderComponent(Button, {
					variant: 'ghost',
					class: '-ml-4 h-auto p-0 hover:bg-transparent font-medium',
					onclick: column.getToggleSortingHandler(),
					children: renderSnippet(headerSnippet)
				});
			},
			cell: ({ row }) => {
				const sizeSnippet = createRawSnippet<[{ size: string }]>((getSize) => {
					const { size } = getSize();
					return {
						render: () => `<div class="text-muted-foreground">${size}</div>`
					};
				});
				return renderSnippet(sizeSnippet, {
					size: row.original.type === 'dir' ? '-' : formatBytes(row.original.size)
				});
			},
			sortingFn: (rowA, rowB) => {
				const sizeA = rowA.original.type === 'dir' ? -1 : rowA.original.size;
				const sizeB = rowB.original.type === 'dir' ? -1 : rowB.original.size;
				return sizeA - sizeB;
			}
		},
		{
			accessorKey: 'last_modified',
			header: ({ column }) => {
				const isSorted = column.getIsSorted();
				const icon = isSorted === 'asc' ? 'lucide:arrow-up' : isSorted === 'desc' ? 'lucide:arrow-down' : 'lucide:arrows-up-down';
				const headerSnippet = createRawSnippet(() => ({
					render: () => `
						<div class="flex items-center gap-2">
							<span>Last Updated</span>
							<iconify-icon icon="${icon}" class="size-4 ${!isSorted ? 'opacity-50' : ''}"></iconify-icon>
						</div>
					`
				}));
				return renderComponent(Button, {
					variant: 'ghost',
					class: '-ml-4 h-auto p-0 hover:bg-transparent font-medium',
					onclick: column.getToggleSortingHandler(),
					children: renderSnippet(headerSnippet)
				});
			},
			cell: ({ row }) => {
				const dateSnippet = createRawSnippet<[{ date: string }]>((getDate) => {
					const { date } = getDate();
					return {
						render: () => `<div class="text-muted-foreground">${date}</div>`
					};
				});
				return renderSnippet(dateSnippet, {
					date: formatDate(row.original.last_modified)
				});
			},
			sortingFn: (rowA, rowB) => {
				const dateA = rowA.original.last_modified ? new Date(rowA.original.last_modified).getTime() : 0;
				const dateB = rowB.original.last_modified ? new Date(rowB.original.last_modified).getTime() : 0;
				return dateA - dateB;
			}
		},
		{
			id: 'actions',
			enableSorting: false,
			enableHiding: false,
			cell: ({ row }) => {
				const file = row.original;
				return renderComponent(FileActionsMenu, {
					file,
					onCopyLink: copyLink,
					onCopyContents: copyContents,
					onRename: handleRename,
					onDelete: handleDelete
				});
			}
		}
	];

	let sorting = $state<SortingState>([{ id: 'name', desc: false }]);

	const table = createSvelteTable({
		get data() {
			return files;
		},
		columns,
		state: {
			get sorting() {
				return sorting;
			}
		},
		onSortingChange: (updater) => {
			if (typeof updater === 'function') {
				sorting = updater(sorting);
			} else {
				sorting = updater;
			}
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	});
</script>

<div class="flex h-full flex-col">
	<div class="mb-2 flex items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			{#if currentPath}
				<Button variant="ghost" size="sm" onclick={goUp}>
					<Icon icon="lucide:arrow-left" class="mr-2 size-4" />
					Back
				</Button>
				<span class="text-sm text-muted-foreground">/{currentPath}</span>
			{/if}
		</div>
		<Button variant="ghost" size="sm" onclick={loadFiles} disabled={loading}>
			<Icon icon="lucide:refresh-cw" class={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
			Refresh
		</Button>
	</div>

	{#if loading}
		<div class="flex h-64 items-center justify-center">
			<Icon icon="lucide:loader-2" class="size-8 animate-spin text-primary" />
		</div>
	{:else if error}
		<div class="flex h-64 items-center justify-center">
			<p class="text-destructive">{error}</p>
		</div>
	{:else}
		<div class="rounded-md border">
			<Table.Root>
				<Table.Header>
					{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
						<Table.Row>
							{#each headerGroup.headers as header (header.id)}
								<Table.Head colspan={header.colSpan}>
									{#if !header.isPlaceholder}
										<FlexRender
											content={header.column.columnDef.header}
											context={header.getContext()}
										/>
									{/if}
								</Table.Head>
							{/each}
						</Table.Row>
					{/each}
				</Table.Header>
				<Table.Body>
					{#each table.getRowModel().rows as row (row.id)}
						<Table.Row data-state={row.getIsSelected() && 'selected'}>
							{#each row.getVisibleCells() as cell (cell.id)}
								<Table.Cell>
									<FlexRender
										content={cell.column.columnDef.cell}
										context={cell.getContext()}
									/>
								</Table.Cell>
							{/each}
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={columns.length} class="h-24 text-center">
								This folder is empty
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
</div>
