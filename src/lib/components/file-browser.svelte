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
			files = contents;
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

	const columns: ColumnDef<FileContent>[] = [
		{
			accessorKey: 'name',
			header: ({ column }) => {
				const headerSnippet = createRawSnippet<[{ column: any }]>((getColumn) => {
					const { column } = getColumn();
					const isSorted = column.getIsSorted();
					return {
						render: () => `
							<button class="flex items-center gap-2 hover:text-foreground transition-colors" onclick="event.target.closest('button').dispatchEvent(new CustomEvent('sort', { bubbles: true }))">
								<span>Name</span>
								${
									isSorted === 'asc'
										? '<iconify-icon icon="lucide:arrow-up" class="size-4"></iconify-icon>'
										: isSorted === 'desc'
											? '<iconify-icon icon="lucide:arrow-down" class="size-4"></iconify-icon>'
											: '<iconify-icon icon="lucide:arrows-up-down" class="size-4 opacity-50"></iconify-icon>'
								}
							</button>
						`
					};
				});
				return renderComponent(Button, {
					variant: 'ghost',
					class: '-ml-4 h-auto p-0 hover:bg-transparent font-medium',
					onclick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
					children: renderSnippet(headerSnippet, { column })
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
				const headerSnippet = createRawSnippet<[{ column: any }]>((getColumn) => {
					const { column } = getColumn();
					const isSorted = column.getIsSorted();
					return {
						render: () => `
							<button class="flex items-center gap-2 hover:text-foreground transition-colors" onclick="event.target.closest('button').dispatchEvent(new CustomEvent('sort', { bubbles: true }))">
								<span>Type</span>
								${
									isSorted === 'asc'
										? '<iconify-icon icon="lucide:arrow-up" class="size-4"></iconify-icon>'
										: isSorted === 'desc'
											? '<iconify-icon icon="lucide:arrow-down" class="size-4"></iconify-icon>'
											: '<iconify-icon icon="lucide:arrows-up-down" class="size-4 opacity-50"></iconify-icon>'
								}
							</button>
						`
					};
				});
				return renderComponent(Button, {
					variant: 'ghost',
					class: '-ml-4 h-auto p-0 hover:bg-transparent font-medium',
					onclick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
					children: renderSnippet(headerSnippet, { column })
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
				const headerSnippet = createRawSnippet<[{ column: any }]>((getColumn) => {
					const { column } = getColumn();
					const isSorted = column.getIsSorted();
					return {
						render: () => `
							<button class="flex items-center justify-end gap-2 w-full hover:text-foreground transition-colors" onclick="event.target.closest('button').dispatchEvent(new CustomEvent('sort', { bubbles: true }))">
								<span>Size</span>
								${
									isSorted === 'asc'
										? '<iconify-icon icon="lucide:arrow-up" class="size-4"></iconify-icon>'
										: isSorted === 'desc'
											? '<iconify-icon icon="lucide:arrow-down" class="size-4"></iconify-icon>'
											: '<iconify-icon icon="lucide:arrows-up-down" class="size-4 opacity-50"></iconify-icon>'
								}
							</button>
						`
					};
				});
				return renderComponent(Button, {
					variant: 'ghost',
					class: '-mr-4 h-auto p-0 hover:bg-transparent font-medium w-full',
					onclick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
					children: renderSnippet(headerSnippet, { column })
				});
			},
			cell: ({ row }) => {
				const sizeSnippet = createRawSnippet<[{ size: string }]>((getSize) => {
					const { size } = getSize();
					return {
						render: () => `<div class="text-right text-muted-foreground">${size}</div>`
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
			id: 'actions',
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
								<Table.Head>
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
						<Table.Row>
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
