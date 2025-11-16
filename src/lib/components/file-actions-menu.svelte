<script lang="ts">
	import type { FileContent } from '$lib/types';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Icon from '@iconify/svelte';

	let {
		file,
		onCopyLink,
		onCopyContents,
		onRename,
		onDelete
	}: {
		file: FileContent;
		onCopyLink: (file: FileContent) => void;
		onCopyContents: (file: FileContent) => void;
		onRename: (file: FileContent) => void;
		onDelete: (file: FileContent) => void;
	} = $props();
</script>

<div class="flex items-center justify-end gap-1">
	<!-- Individual action buttons - shown on larger screens -->
	{#if file.type === 'file'}
		<div class="hidden items-center gap-1 lg:flex">
			<Button
				variant="ghost"
				size="icon"
				class="size-8"
				onclick={() => onCopyLink(file)}
				title="Copy CDN Link"
			>
				<Icon icon="lucide:link" class="size-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				class="size-8"
				onclick={() => onCopyContents(file)}
				title="Copy Contents"
			>
				<Icon icon="lucide:copy" class="size-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				class="size-8"
				onclick={() => window.open(file.download_url, '_blank')}
				title="Download"
			>
				<Icon icon="lucide:download" class="size-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				class="size-8"
				onclick={() => onRename(file)}
				title="Rename"
			>
				<Icon icon="lucide:pencil" class="size-4" />
			</Button>
		</div>
	{/if}
	<Button
		variant="ghost"
		size="icon"
		class="size-8 {file.type === 'file' ? 'hidden lg:flex' : ''}"
		onclick={() => onDelete(file)}
		title="Delete"
	>
		<Icon icon="lucide:trash-2" class="size-4 text-destructive" />
	</Button>

	<!-- Dropdown menu - shown on smaller screens -->
	<div class="lg:hidden">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" size="icon" class="size-8">
						<Icon icon="lucide:more-horizontal" class="size-4" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end">
				{#if file.type === 'file'}
					<DropdownMenu.Item onclick={() => onCopyLink(file)}>
						<Icon icon="lucide:link" class="mr-2 size-4" />
						Copy CDN Link
					</DropdownMenu.Item>
					<DropdownMenu.Item onclick={() => onCopyContents(file)}>
						<Icon icon="lucide:copy" class="mr-2 size-4" />
						Copy Contents
					</DropdownMenu.Item>
					<DropdownMenu.Item onclick={() => window.open(file.download_url, '_blank')}>
						<Icon icon="lucide:download" class="mr-2 size-4" />
						Download
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<DropdownMenu.Item onclick={() => onRename(file)}>
						<Icon icon="lucide:pencil" class="mr-2 size-4" />
						Rename
					</DropdownMenu.Item>
				{/if}
				<DropdownMenu.Item onclick={() => onDelete(file)} class="text-destructive">
					<Icon icon="lucide:trash-2" class="mr-2 size-4" />
					Delete
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</div>
