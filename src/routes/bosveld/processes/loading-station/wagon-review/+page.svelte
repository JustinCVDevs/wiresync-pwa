<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import type { Assay } from '$lib/types/assay';
	import type { Wagon } from '$lib/types/wagon';
	import { formPersistenceService } from '$lib/services/formPersistenceService';

	const sampleId = $page.url.searchParams.get('sampleId') || '';
	let assay: Assay | null = null;
	let wagons: Wagon[] = [];
	let currentStep = 4;
	
	// Process steps
	const processSteps = ['Sample Details', 'FEL Weight Capturing', 'Complete'];

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		if (sampleId) {
			const result = await indexedDBService.getAssayById(sampleId);
			assay = result ?? null;
			
			if (assay?.linkedWagonIds?.length) {
				const fetchedWagons = await Promise.all(
					assay.linkedWagonIds.map(async id => {
						const wagon = await indexedDBService.getRecord('wagons', id);
						return wagon || null;
					})
				);
				wagons = fetchedWagons.filter((wagon): wagon is Wagon => wagon !== null);
			}
		}
	}

	function handleNewWagon(e: Event) {
		e.preventDefault();
		goto(`/bosveld/processes/loading-station/fel-weight-capturing?sampleId=${sampleId}`);
	}

	function handleCompleteLoading(e: Event) {
		// Navigate back to west loadout page for new sample ID
		e.preventDefault();
		formPersistenceService.clearForm('west_loadout');
		goto('/bosveld/processes/complete');
	}

	function handleCancel() {
		goto('/bosveld/processes');
	}
</script>

<ProcessLayout
	title={`Loaded Wagons for Sample ${assay?.name}`}
	steps={processSteps}
	{currentStep}
	on:submit={handleCompleteLoading}
	on:cancel={handleCancel}
	cancelPath="/bosveld/processes"
>
	

	<div class="space-y-4">
		{#if assay}
			<div class="bg-white p-4 rounded-lg shadow-sm mb-4">
				<h6 class="text-lg font-semibold mb-2">Transaction Details</h6>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<p class="text-sm text-gray-500">Sample ID</p>
						<p class="font-medium">{assay.name}</p>
					</div>
					<div>
						<p class="text-sm text-gray-500">Product Grade</p>
						<p class="font-medium">{assay.productGrade}</p>
					</div>
				</div>
			</div>
<!-- BUG: WHEN BACKING OUT IT DOESNT RENDER THE WAGONS -->
			<h6 class="font-medium">Linked Wagons ({assay.linkedWagonIds?.length})</h6>
			<div class="bg-white p-4 rounded-lg shadow-sm">
				{#if wagons.length > 0}
					<div class="space-y-3">
						{#each wagons as wagon}
							<div class="border border-gray-200 rounded-md p-3 flex items-center">
								<div class="flex-1">
									<div class="flex items-center">
										<div class="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
										<span class="font-medium">Wagon ID: {wagon.wagonIdSimple}</span>
									</div>
									<div class="mt-1 text-sm text-gay">
										<p>Weight: {wagon.weight} kg</p>
										<p>Sample ID: {assay.name}</p>
										<p>Sampling: {wagon.samplingStatus}</p>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-center py-4">
						<p class="text-gray-500">No wagons added yet</p>
					</div>
				{/if}
			</div>
		{:else}
			<div class="text-center py-8">
				<p class="text-gray-500">Loading sample details...</p>
			</div>
		{/if}

		<div class="flex flex-col items-center mt-6 space-y-4">
			<button 
				class="bg-gray hover:bg-blue-700 text-white text-sm  py-2 px-6 rounded-md w-full max-w-xs"
				on:click={handleNewWagon}
			>
				+ New Wagon
			</button>
			
			<!-- <button 
				class="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-md w-full max-w-xs"
				on:click={handleCompleteLoading}
			>
				Complete Loading
			</button>
			
			<button 
				class="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-6 rounded-md w-full max-w-xs"
				on:click={handleCancel}
			>
				Cancel
			</button> -->
		</div>
	</div>
</ProcessLayout>