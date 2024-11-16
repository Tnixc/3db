<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div>
	<h1>Authentication Error</h1>
	<p>There was an error during authentication.</p>
	<button on:click={() => goto('/')}>Return to Home</button>
</div>
