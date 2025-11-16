<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { authStore } from '$lib/stores/auth';
	import Icon from '@iconify/svelte';

	let { onSignOut }: { onSignOut: () => void } = $props();

	const user = $derived($authStore.status === 'ready' ? $authStore.user : null);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" class="relative size-8 rounded-full">
				<Avatar.Root class="size-8">
					<Avatar.Image src={user?.avatar_url} alt={user?.login} />
					<Avatar.Fallback>{user?.login?.slice(0, 2).toUpperCase()}</Avatar.Fallback>
				</Avatar.Root>
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="w-56">
		<DropdownMenu.Label class="font-normal">
			<div class="flex flex-col space-y-1">
				<p class="text-sm font-medium leading-none">{user?.name || user?.login}</p>
				<p class="text-muted-foreground text-xs leading-none">{user?.email}</p>
			</div>
		</DropdownMenu.Label>
		<DropdownMenu.Separator />
		<DropdownMenu.Item onclick={() => window.open(`https://github.com/${user?.login}`, '_blank')}>
			<Icon icon="lucide:github" class="mr-2 size-4" />
			View GitHub Profile
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<DropdownMenu.Item onclick={onSignOut} class="text-destructive">
			<Icon icon="lucide:log-out" class="mr-2 size-4" />
			Sign Out
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
