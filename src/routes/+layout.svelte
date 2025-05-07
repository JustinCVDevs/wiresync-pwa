<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/button/button.svelte';
	import '../app.scss';
	let { children } = $props();
</script>
  {@render children()}


