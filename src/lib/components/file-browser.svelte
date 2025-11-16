<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as github from '$lib/services/github';
	import { formatBytes } from '$lib/utils';
	import type { FileContent } from '$lib/types';
	import { currentRepository } from '$lib/stores/repositories';
	import { needsReload } from '$lib/stores/reload';
	import type { GitHubConfig } from '$lib/services/github';
	import Icon from '@iconify/svelte';
	import { useSidebar } from '$lib/components/ui/sidebar';

	let { config } = $props<{ config: GitHubConfig }>();

	const sidebar = useSidebar();

	let currentPath = $state('');
	let contents = $state<FileContent[]>([]);
	let error = $state<string | null>(null);
	let loading = $state(false);
	let sortBy = $state<'name' | 'size' | 'type'>('name');
	let sortOrder = $state<'asc' | 'desc'>('asc');

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
		}
	}

	let copiedLinks = $state<string[]>([]);
	let copiedContents = $state<string[]>([]);

	async function handleCopyLink(item: FileContent, event: MouseEvent) {
		event.stopPropagation();
		await navigator.clipboard.writeText(item.download_url);
		copiedLinks.push(item.path);
		setTimeout(() => {
			copiedLinks = copiedLinks.filter((p) => p !== item.path);
		}, 2000);
	}

	async function handleCopyContents(item: FileContent, event: MouseEvent) {
		event.stopPropagation();
		try {
			const response = await fetch(item.download_url);
			const text = await response.text();
			await navigator.clipboard.writeText(text);
			copiedContents.push(item.path);
			setTimeout(() => {
				copiedContents = copiedContents.filter((p) => p !== item.path);
			}, 2000);
		} catch (err) {
			console.error('Failed to copy contents:', err);
		}
	}

	function handleDownload(item: FileContent, event: MouseEvent) {
		event.stopPropagation();
		fetch(item.download_url)
			.then((response) => response.blob())
			.then((blob) => {
				const link = document.createElement('a');
				link.href = URL.createObjectURL(blob);
				link.download = item.name;
				link.click();
			})
			.catch(console.error);
	}

	async function handleDelete(item: FileContent, event: MouseEvent) {
		event.stopPropagation();
		if (
			!$currentRepository ||
			!confirm(`Delete ${item.type === 'dir' ? 'folder' : 'file'}: ${item.name}?`)
		)
			return;

		try {
			if (item.type === 'dir') {
				await github.deleteFolder(
					config,
					$currentRepository.owner.login,
					$currentRepository.name,
					item.path
				);
			} else {
				await github.deleteFile(
					config,
					$currentRepository.owner.login,
					$currentRepository.name,
					item.path,
					item.sha
				);
			}
			await loadContents(currentPath);
			needsReload.set(true);
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: `Failed to delete ${item.type === 'dir' ? 'folder' : 'file'}`;
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

	function getSortedContents() {
		return contents.toSorted((a, b) => {
			// Always put directories first
			if (a.type === 'dir' && b.type !== 'dir') return -1;
			if (b.type === 'dir' && a.type !== 'dir') return 1;

			// Sort by selected criteria
			let comparison = 0;
			if (sortBy === 'name') {
				comparison = a.name.localeCompare(b.name);
			} else if (sortBy === 'size') {
				comparison = (a.size || 0) - (b.size || 0);
			} else if (sortBy === 'type') {
				const aExt = a.name.split('.').pop() || '';
				const bExt = b.name.split('.').pop() || '';
				comparison = aExt.localeCompare(bExt);
			}

			return sortOrder === 'asc' ? comparison : -comparison;
		});
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

<Tooltip.Provider>
	<div class="space-y-4">
		<div class="flex items-center justify-between gap-4">
			<div class="flex items-center gap-2">
				<Tooltip.Root>
					<Tooltip.Trigger asChild let:builder>
						<Button builders={[builder]} variant="ghost" size="icon" onclick={sidebar.toggle}>
							<Icon icon="lucide:panel-left" class="h-5 w-5" />
							<span class="sr-only">Toggle Sidebar</span>
						</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>Toggle Sidebar</p>
					</Tooltip.Content>
				</Tooltip.Root>

			{#if $currentRepository}
				{#each getBreadcrumbs() as crumb, i}
					<Button variant="ghost" size="sm" onclick={() => loadContents(crumb.path)}>
						{crumb.name}
					</Button>
					{#if i < getBreadcrumbs().length - 1}
						<Icon icon="lucide:chevron-right" class="h-4 w-4 text-muted-foreground" />
					{/if}
				{/each}
			{/if}
		</div>

		{#if $currentRepository && contents.length > 0}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild let:builder>
					<Button builders={[builder]} variant="outline" size="sm">
						<Icon icon="lucide:arrow-up-down" class="mr-2 h-4 w-4" />
						Sort: {sortBy}
						<Icon icon="lucide:chevron-down" class="ml-2 h-4 w-4" />
					</Button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					<DropdownMenu.Label>Sort by</DropdownMenu.Label>
					<DropdownMenu.Separator />
					<DropdownMenu.RadioGroup bind:value={sortBy}>
						<DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
						<DropdownMenu.RadioItem value="size">Size</DropdownMenu.RadioItem>
						<DropdownMenu.RadioItem value="type">Type</DropdownMenu.RadioItem>
					</DropdownMenu.RadioGroup>
					<DropdownMenu.Separator />
					<DropdownMenu.Label>Order</DropdownMenu.Label>
					<DropdownMenu.RadioGroup bind:value={sortOrder}>
						<DropdownMenu.RadioItem value="asc">
							<Icon icon="lucide:arrow-up" class="mr-2 h-4 w-4" />
							Ascending
						</DropdownMenu.RadioItem>
						<DropdownMenu.RadioItem value="desc">
							<Icon icon="lucide:arrow-down" class="mr-2 h-4 w-4" />
							Descending
						</DropdownMenu.RadioItem>
					</DropdownMenu.RadioGroup>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		{/if}
	</div>

	{#if !$currentRepository}
		<div class="py-8 text-center text-muted-foreground">
			Select a repository to view its contents
		</div>
	{:else if loading}
		<div class="flex items-center justify-center py-8">
			<Icon icon="lucide:loader-2" class="mr-2 h-6 w-6 animate-spin" />
			<span>Loading...</span>
		</div>
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
						<th class="p-3 text-left text-sm font-medium">Name</th>
						<th class="p-3 text-left text-sm font-medium">Size</th>
						<th class="p-3 text-right text-sm font-medium">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each getSortedContents() as item}
						<tr class="border-b border-border/40 last:border-0 hover:bg-accent/50">
							<td class="p-3">
								<button
									class="group flex items-center gap-2 text-left hover:underline"
									onclick={() => handleItemClick(item)}
								>
									{#if item.type === 'dir'}
										<Icon icon="lucide:folder" class="h-4 w-4 text-blue-500" />
									{:else}
										<Icon icon="lucide:file" class="h-4 w-4 text-muted-foreground" />
									{/if}
									<span>{item.name}</span>
									{#if item.type === 'dir'}
										<Icon
											icon="lucide:chevron-right"
											class="h-4 w-4 opacity-0 transition group-hover:opacity-100"
										/>
									{/if}
								</button>
							</td>
							<td class="p-3 text-sm text-muted-foreground">
								{item.type === 'dir' ? '--' : formatBytes(item.size)}
							</td>
							<td class="p-3">
								<div class="flex items-center justify-end gap-1">
									{#if item.type === 'file'}
										<!-- Open in New Tab -->
										<Tooltip.Root>
												<Tooltip.Trigger asChild let:builder>
													<Button
														builders={[builder]}
														variant="ghost"
														size="sm"
														onclick={(e) => {
															e.stopPropagation();
															window.open(item.download_url, '_blank');
														}}
													>
														<Icon icon="lucide:external-link" class="h-4 w-4" />
														<span class="sr-only">Open</span>
													</Button>
												</Tooltip.Trigger>
												<Tooltip.Content>
													<p>Open in new tab</p>
												</Tooltip.Content>
											</Tooltip.Root>

										<!-- Copy Link -->
										<Tooltip.Root>
												<Tooltip.Trigger asChild let:builder>
													<Button
														builders={[builder]}
														variant="ghost"
														size="sm"
														onclick={(e) => handleCopyLink(item, e)}
													>
														<Icon
															icon={copiedLinks.includes(item.path)
																? 'lucide:check'
																: 'lucide:link'}
															class="h-4 w-4"
														/>
														<span class="sr-only">Copy Link</span>
													</Button>
												</Tooltip.Trigger>
												<Tooltip.Content>
													<p>Copy link</p>
												</Tooltip.Content>
											</Tooltip.Root>

										<!-- Copy Contents -->
										<Tooltip.Root>
												<Tooltip.Trigger asChild let:builder>
													<Button
														builders={[builder]}
														variant="ghost"
														size="sm"
														onclick={(e) => handleCopyContents(item, e)}
													>
														<Icon
															icon={copiedContents.includes(item.path)
																? 'lucide:check'
																: 'lucide:copy'}
															class="h-4 w-4"
														/>
														<span class="sr-only">Copy Contents</span>
													</Button>
												</Tooltip.Trigger>
												<Tooltip.Content>
													<p>Copy file contents</p>
												</Tooltip.Content>
											</Tooltip.Root>

										<!-- Download -->
										<Tooltip.Root>
												<Tooltip.Trigger asChild let:builder>
													<Button
														builders={[builder]}
														variant="ghost"
														size="sm"
														onclick={(e) => handleDownload(item, e)}
													>
														<Icon icon="lucide:download" class="h-4 w-4" />
														<span class="sr-only">Download</span>
													</Button>
												</Tooltip.Trigger>
												<Tooltip.Content>
													<p>Download file</p>
												</Tooltip.Content>
											</Tooltip.Root>
									{/if}

									<!-- Delete -->
									<Tooltip.Root>
											<Tooltip.Trigger asChild let:builder>
												<Button
													builders={[builder]}
													variant="ghost"
													size="sm"
													onclick={(e) => handleDelete(item, e)}
													class="text-destructive hover:bg-destructive/10 hover:text-destructive"
												>
													<Icon icon="lucide:trash-2" class="h-4 w-4" />
													<span class="sr-only">Delete</span>
												</Button>
											</Tooltip.Trigger>
											<Tooltip.Content>
												<p>Delete {item.type === 'dir' ? 'folder' : 'file'}</p>
											</Tooltip.Content>
										</Tooltip.Root>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	</div>
</Tooltip.Provider>
