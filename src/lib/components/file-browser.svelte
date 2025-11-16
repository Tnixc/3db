<script lang="ts">
	import type { FileContent } from '$lib/types';
	import {
		type ColumnDef,
		type SortingState,
		type ColumnMeta,
		getCoreRowModel,
		getSortedRowModel
	} from '@tanstack/table-core';

	interface CustomColumnMeta extends ColumnMeta<FileContent, unknown> {
		headerClass?: string;
		cellClass?: string;
	}
	import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Icon from '@iconify/svelte';
	import { createRawSnippet } from 'svelte';
	import { renderSnippet, renderComponent } from '$lib/components/ui/data-table/index.js';
	import FileActionsMenu from '$lib/components/file-actions-menu.svelte';
	import { currentRepository } from '$lib/stores/repositories';
	import { authStore } from '$lib/stores/auth';
	import { getContents, deleteFile, deleteFolder, createFile } from '$lib/services/github';
	import { toast } from 'svelte-sonner';

	let {
		currentPath = $bindable(''),
		onNavigate,
		onRefresh = $bindable()
	}: {
		currentPath?: string;
		onNavigate?: (path: string) => void;
		onRefresh?: () => Promise<void>;
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

	// Expose loadFiles via onRefresh binding
	$effect(() => {
		onRefresh = loadFiles;
	});

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
			toast.success(`Deleted ${file.name}`);
		} catch (err) {
			console.error('Failed to delete:', err);
			toast.error('Failed to delete file/folder');
		}
	}

	function copyLink(file: FileContent) {
		if (file.download_url) {
			navigator.clipboard.writeText(file.download_url);
			toast.success('CDN link copied to clipboard');
		}
	}

	async function copyContents(file: FileContent) {
		if (!$currentRepository || $authStore.status !== 'ready' || file.type !== 'file') return;

		try {
			const config = { token: $authStore.token, userEmail: $authStore.user.email };
			const contents = await getContents(
				config,
				$currentRepository.owner.login,
				$currentRepository.name,
				file.path
			);

			if (Array.isArray(contents)) return; // Shouldn't happen for a file

			const fileData = contents as FileContent;
			// Decode base64 content
			const content = fileData.content ? atob(fileData.content) : '';
			await navigator.clipboard.writeText(content);
			toast.success('File contents copied to clipboard');
		} catch (err) {
			console.error('Failed to copy contents:', err);
			toast.error('Failed to copy file contents');
		}
	}

	async function handleRename(file: FileContent) {
		if (!$currentRepository || $authStore.status !== 'ready') return;

		const newName = prompt(`Rename ${file.name} to:`, file.name);
		if (!newName || newName === file.name) return;

		try {
			const config = { token: $authStore.token, userEmail: $authStore.user.email };

			if (file.type === 'file') {
				// Get current file content
				const contents = await getContents(
					config,
					$currentRepository.owner.login,
					$currentRepository.name,
					file.path
				);

				if (Array.isArray(contents)) return; // Shouldn't happen for a file

				const fileData = contents as FileContent;

				// Create new file with same content
				const pathParts = file.path.split('/');
				pathParts[pathParts.length - 1] = newName;
				const newPath = pathParts.join('/');

				// Decode and re-encode content
				const content = fileData.content ? atob(fileData.content) : '';

				await createFile(
					config,
					$currentRepository.owner.login,
					$currentRepository.name,
					newPath,
					content,
					`Rename ${file.name} to ${newName}`
				);

				// Delete old file
				await deleteFile(
					config,
					$currentRepository.owner.login,
					$currentRepository.name,
					file.path,
					file.sha
				);

				await loadFiles();
				toast.success(`Renamed ${file.name} to ${newName}`);
			} else {
				toast.error('Renaming folders is not supported yet');
			}
		} catch (err) {
			console.error('Failed to rename:', err);
			toast.error('Failed to rename file');
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
			header: 'Name',
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
			accessorKey: 'size',
			header: 'Size',
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
			}
		},
		{
			id: 'actions',
			header: '',
			meta: {
				headerClass: 'text-right',
				cellClass: 'text-right'
			},
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
	{#if currentPath}
		<div class="mb-2 flex items-center gap-2">
			<Button variant="ghost" size="sm" onclick={goUp}>
				<Icon icon="lucide:arrow-left" class="mr-2 size-4" />
				Back
			</Button>
			<span class="text-sm text-muted-foreground">/{currentPath}</span>
		</div>
	{/if}

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
								<Table.Head class={(header.column.columnDef.meta as CustomColumnMeta)?.headerClass || ''}>
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
								<Table.Cell class={(cell.column.columnDef.meta as CustomColumnMeta)?.cellClass || ''}>
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
