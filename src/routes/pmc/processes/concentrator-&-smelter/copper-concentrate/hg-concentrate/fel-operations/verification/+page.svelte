<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Truck } from '$lib/types/truck';

	const truckRegistration = $page.url.searchParams.get('truckRegistration') || '';
	let truck: Truck | null = null;
	let currentStep = 2;
	let processLayout: ProcessLayout;
	
	// Process steps
	const processSteps = ['Sample Details', 'Complete'];

	onMount(async () => {
		await loadTruckData();
	});

	async function loadTruckData() {
		if (truckRegistration) {
			const result = (await indexedDBService.getAllRecords('trucks')).filter(
				(t) => t.registration === truckRegistration
			)[0];
			truck = result ?? null;
		}
	}

	function handleCancel() {
		goto('/pmc/processes/concentrator-&-smelter/copper-concentrate/hg-concentrate');
	}

	function handleSubmit() {
		processLayout.setSuccess('Data saved successfully');

		setTimeout(() => {
			goto('/pmc/processes/concentrator-&-smelter/copper-concentrate/hg-concentrate');
		}, 1000);
	}

</script>

<ProcessLayout
	title="Sample Details Verification"
	steps={processSteps}
	{currentStep}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
	bind:this={processLayout}
	cancelPath="/pmc/processes/concentrator-&-smelter/copper-concentrate"
>
	<div class="space-y-4">
		{#if truck}
				<div class="bg-white p-4 rounded-lg shadow-sm">
					<div class="grid grid-cols-1 gap-4">
						<div>
							<p class="text-sm text-gray-500 font-bold">Truck Registration Nr</p>
							<p class="font-medium">{truck.registration}</p>
						</div>

						<div>
							<p class="text-sm text-gray-500 font-bold">FEL Weight (Ton)</p>
							<p class="font-medium">{truck.felWeight}</p>
						</div>
					</div>
				</div>
		{:else}
			<div class="text-center py-8">
				<p class="text-gray-500">Loading sample details...</p>
			</div>
		{/if}
	</div>
</ProcessLayout>