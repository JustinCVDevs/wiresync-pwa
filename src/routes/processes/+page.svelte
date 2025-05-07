<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	let isOnline = navigator.onLine;

	onMount(() => {
		window.addEventListener('online', () => (isOnline = true));
		window.addEventListener('offline', () => (isOnline = false));

		return () => {
			window.removeEventListener('online', () => (isOnline = true));
			window.removeEventListener('offline', () => (isOnline = false));
		};
	});

	const processes = [
		'Marshaling Receival',
		'Marshaling Dispatch',
		'West Loadout (Wagons)',
		'East Loadout (Wagons)',
		'Gravelotte (Trucks)',
		'Truck Loadout',
		'Copper Truck Loadout',
		'Acid Truck'
	] as const;

	function handleProcessSelect(process: string) {
		if (process === 'Marshaling Receival') {
			goto('/processes/marshaling-receival');
		} else if (process === 'Marshaling Dispatch') {
			goto('/processes/marshaling-dispatch');
		} else if (process === 'West Loadout (Wagons)') {
			goto('/processes/west-loadout');
		} else if (process === 'East Loadout (Wagons)') {
			goto('/processes/east-loadout');
		} else if (process === 'Truck Loadout') {
			goto('/processes/truck-loadout');
		} else if (process === 'Copper Truck Loadout') {
			goto('/processes/copper-truck-loadout');
		} else if (process === 'Acid Truck') {
			goto('/processes/acid-truck');
		}
	}
	// Add other process routes as needed
</script>

<main class="bg-gray-50 min-h-screen flex flex-col items-center justify-start p-4">
	<section class="w-full max-w-sm bg-white rounded-xl shadow-lg p-6">
	  <h1 class="text-2xl font-semibold text-gray-900 mb-6">Select Process</h1>
	  <div class="space-y-4">
		{#each processes as process}
		  <button
			class="w-full bg-gray-800 text-white py-3 rounded-lg text-base font-medium hover:bg-gray-700 active:bg-gray-900 transition"
			on:click={() => handleProcessSelect(process)}
		  >
			{process}
		  </button>
		{/each}
	  </div>
	</section>
  </main>