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
