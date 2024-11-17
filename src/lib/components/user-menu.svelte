<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { theme } from '$lib/stores/theme';
	import Icon from '@iconify/svelte';
	let { user, onSignOut } = $props<{
		user: App.PageData['user'];
		onSignOut: () => void;
	}>();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		<Button size="lg" variant="ghost" class="relative h-12 w-full text-start">
			<div class="flex flex-col">
				<p class="text-sm font-medium">{user?.user_metadata.name}</p>
				<p class="text-xs text-muted-foreground">{user?.email}</p>
			</div>
			<img
				src={user?.user_metadata.avatar_url}
				alt="Profile"
				class="ml-auto mr-0 h-8 w-8 rounded-full"
			/>
		</Button>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="w-56" align="end">
		<div class="border-b px-2 py-1.5">
			<p class="text-sm font-medium">{user?.user_metadata.name}</p>
			<p class="text-xs text-muted-foreground">{user?.email}</p>
		</div>
		<DropdownMenu.Item onclick={() => theme.toggle()}>
			<Icon icon={$theme === 'dark' ? 'lucide:sun' : 'lucide:moon'} class="mr-2 h-4 w-4" />
			<span>Toggle Theme</span>
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<DropdownMenu.Item onclick={onSignOut} class="text-red-600">
			<Icon icon="lucide:log-out" class="mr-2 h-4 w-4" />
			<span>Sign Out</span>
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
