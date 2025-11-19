<script lang="ts">
	import { goto } from '$app/navigation';
	import { pocketbaseService } from '$lib/services/pocketbaseService';
	import { onMount } from 'svelte';

	let allowedLocations: any = [];

	const locations = [
		{ name: 'PMC', route: '/pmc/processes' },
		{ name: 'Bosveld', route: '/bosveld/processes' },
		{ name: 'Richards Bay', route: '/richardsbay/processes' }
	] as const;

	function normalize(str: string) {
		return str.replace(/\s+/g, '').toUpperCase();
	}

	$: visibleLocations = locations.filter(loc =>
		allowedLocations.map(normalize).includes(normalize(loc.name))
	);

	onMount(async () => {
		allowedLocations = pocketbaseService.currentUser?.allowedLocations || [];
	});
</script>

<section class="space-y-4 px-4">
	<h1 class="text-2xl font-semibold text-gray text-center">Locations</h1>
		{#each visibleLocations as { name, route }}
			<button
				on:click={() => goto(route)}
				class="flex w-full transform items-center gap-4 rounded-lg border-1 border-gray-100 px-5 py-4 shadow-lg transition-transform
					hover:-translate-y-1 hover:shadow-lg focus:ring-2 focus:ring-blue-500 focus:outline-nonem font-bold text-white text-uppercase bg-gray text-center text-white"
			>
				<span class="flex-1">{name}</span>
			</button>
		{/each}
</section>
