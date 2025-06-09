<script>
	import { onMount } from 'svelte'
	import { browser, dev } from '$app/environment'
	import '../app.css';

	// replaced dynamically
	const date = '__DATE__'
	const enableSwDev = 'true'

	const enableManifest = (!dev && browser) || (dev && browser && enableSwDev === 'true')

	let ReloadPrompt
	onMount(async () => {
		enableManifest && (ReloadPrompt = (await import('$lib/components/ReloadPrompt.svelte')).default)
	})
</script>
<svelte:head>
	{#if enableManifest}
		<link rel="manifest" href="/manifest.webmanifest">
	{/if}
</svelte:head>


	<slot />


{#if ReloadPrompt}
	<svelte:component this={ReloadPrompt} />
{/if}
