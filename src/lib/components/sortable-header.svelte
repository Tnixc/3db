<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Icon from '@iconify/svelte';

	let {
		column,
		children,
		align = 'left'
	}: {
		column: any;
		children: any;
		align?: 'left' | 'right';
	} = $props();

	const isSorted = $derived(column.getIsSorted());
	const icon = $derived(
		isSorted === 'asc'
			? 'lucide:arrow-up'
			: isSorted === 'desc'
				? 'lucide:arrow-down'
				: 'lucide:arrows-up-down'
	);

	function handleClick() {
		column.toggleSorting(column.getIsSorted() === 'asc');
	}
</script>

<Button
	variant="ghost"
	class="{align === 'right' ? '-mr-4' : '-ml-4'} h-auto p-0 hover:bg-transparent font-medium {align === 'right' ? 'w-full' : ''}"
	onclick={handleClick}
>
	<div class="flex items-center gap-2 {align === 'right' ? 'justify-end w-full' : ''}">
		<span>{children}</span>
		<Icon {icon} class="size-4 {!isSorted ? 'opacity-50' : ''}" />
	</div>
</Button>
