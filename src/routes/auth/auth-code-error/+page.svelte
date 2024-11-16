<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div class="error-container">
	<h1>Authentication Error</h1>
	<p>There was an error during authentication.</p>
	<button on:click={() => goto('/')}>Return to Home</button>
</div>

<style>
	.error-container {
		text-align: center;
		padding: 2rem;
	}
</style>
