<script lang="ts">
	import { page } from '$app/stores';
	import Header from '$lib/components/Header.svelte';
	import { Toaster } from 'svelte-sonner';
	import '../../app.scss';

	let { children } = $props();
	const message = $derived($page.url.searchParams.get('error'));
	


</script>
<Header />
{#if message != null }
<Toaster title={message} />	
{/if}
{@render children()}
