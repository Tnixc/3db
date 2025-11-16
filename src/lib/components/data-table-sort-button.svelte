<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import Icon from '@iconify/svelte';

	let { column, children, ...restProps }: { column: any; children: string } & Omit<ComponentProps<typeof Button>, 'children'> = $props();

	const isSorted = $derived(column.getIsSorted());
	const icon = $derived(
		isSorted === 'asc'
			? 'lucide:arrow-up'
			: isSorted === 'desc'
				? 'lucide:arrow-down'
				: 'lucide:arrows-up-down'
	);
</script>

<Button
	variant="ghost"
	class="-ml-4 h-auto p-0 hover:bg-transparent font-medium"
	onclick={column.getToggleSortingHandler()}
	{...restProps}
>
	<div class="flex items-center gap-2">
		<span>{children}</span>
		<Icon {icon} class="size-4 {!isSorted ? 'opacity-50' : ''}" />
	</div>
</Button>
