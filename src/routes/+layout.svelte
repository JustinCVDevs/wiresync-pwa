<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/button/button.svelte';
	import '../app.css';
	import { page } from '$app/stores';

	let { children } = $props();
	const message = $derived($page.url.searchParams.get('error'));
</script>

{message}
{@render children()}
