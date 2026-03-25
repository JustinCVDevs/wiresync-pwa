<script lang="ts">
	import { onMount } from 'svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { goto } from '$app/navigation';
	import type { TruckLoad } from '$lib/types/truckLoad';
	import { page } from '$app/stores';

	const processSteps = ['Truck Details', 'Review'];
	let currentStep = 2;
	let processLayout: ProcessLayout;

	let truckLoad: TruckLoad | null = null;
	let error = '';

	// Extract IDs from query parameters
	const sampleId = $page.url.searchParams.get('sampleId') || '';
	const truckRegistration = $page.url.searchParams.get('truckRegistration') || '';

	onMount(async () => {
		await loadTruckLoadData();
	});

	async function loadTruckLoadData() {
		if (sampleId) {
			const result = (await indexedDBService.getAllRecords('truckLoads')).filter(
				(t) => t.sampleId === sampleId && t.siteLocation === 'PMC'
			)[0];
			truckLoad = result ?? null;
		}
	}

	function handleCancel() {
		goto('/pmc/processes/concentrator-&-smelter');
	}

	function handleSubmit() {
		processLayout.setSuccess('Data saved successfully');

		setTimeout(() => {
			goto('/pmc/processes/concentrator-&-smelter/sulphuric-acid');
		}, 1000);
	}
</script>

<ProcessLayout
	title="  Sample Details Verification"
	steps={processSteps}
	{currentStep}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
	bind:this={processLayout}
	cancelPath="/pmc/processes/concentrator-&-smelter"
>
	<div class="p-4">
		<h5 class="text-gray text-center text-xl font-bold">Truck Review</h5>

		{#if error}
			<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
				{error}
			</div>
		{/if}

		{#if truckLoad}
			<div class="rounded-lg bg-white p-4 shadow-sm">
				<div class="grid grid-cols-1 gap-4">
					<div>
						<p class="text-sm font-bold text-gray-500">Truck Registration</p>
						<p class="font-medium">{truckRegistration}</p>
					</div>

					<div>
						<p class="text-sm font-bold text-gray-500">Tank Loaded From</p>
						<p class="font-medium">{truckLoad.tankLocation}</p>
					</div>

					<div>
						<p class="text-sm font-bold text-gray-500">Strong Acid/Weak Acid</p>
						<p class="font-medium">{truckLoad.acidType}</p>
					</div>

					<div>
						<p class="text-sm font-bold text-gray-500">Sample ID</p>
						<p class="font-medium">{truckLoad.sampleId}</p>
					</div>
				</div>
			</div>
		{:else}
			<div class="py-8 text-center">
				<p class="text-gray-500">Loading sample details...</p>
			</div>
		{/if}
	</div>
</ProcessLayout>
