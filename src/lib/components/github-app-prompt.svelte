<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Icon from '@iconify/svelte';
	import * as Card from '$lib/components/ui/card/index.js';

	let { installationUrl } = $props<{
		installationUrl: string;
	}>();
</script>

<div class="fixed inset-0 grid place-items-center">
	<Card.Root class="max-w-lg">
		<Card.Content>
			<Card.Header>
				<Card.Title>Install 3db</Card.Title>
				<Card.Description>
					To use 3db, you need to install our GitHub App. This will allow us to manage your
					repositories.
				</Card.Description>
			</Card.Header>

			<Card.Footer>
				<div class="my-4 flex w-full flex-col gap-4">
					<div class="rounded-md bg-muted p-4">
						<h4 class="mb-2 font-medium">The app will only use these permissions:</h4>
						<ul class=" space-y-2 text-sm">
							<li class="flex items-center">
								<Icon icon="lucide:check" class="mr-2 h-4 w-4" />
								Read and write access to repositories
							</li>
							<li class="flex items-center">
								<Icon icon="lucide:check" class=" mr-2 h-4 w-4" />
								Create and delete repositories
							</li>
						</ul>
						<p class="mt-4 text-sm text-muted-foreground">
							Note: A repo called '3db-service' will be created. It holds the metadata for connected
							repos.
						</p>
					</div>
					<Button onclick={() => (window.location.href = installationUrl)} class="w-fit">
						<Icon icon="lucide:arrow-right" class="mr-2 h-4 w-4" />
						Install GitHub App
					</Button>
				</div>
			</Card.Footer>
		</Card.Content>
	</Card.Root>
</div>
