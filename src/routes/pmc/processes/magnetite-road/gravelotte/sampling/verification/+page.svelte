<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Fleet, TruckLoad, Assay } from '$lib';

	const sampleId = $page.url.searchParams.get('sampleId') || '';
	const truckRegistration = $page.url.searchParams.get('truckRegistration') || '';
	let assay: Assay | null = null;
	let truckLoad: TruckLoad | null = null;
	let fleet: Fleet | null = null;
	let currentStep = 2;
	let processLayout: ProcessLayout;
	
	// Process steps
	const processSteps = ['Sample Details', 'Complete'];

	onMount(async () => {
		await loadAssayData();
		await loadTruckLoadData();
		await loadFleetData();
	});

	async function loadAssayData() {
		if (sampleId) {
			const result = (await indexedDBService.getAllRecords('assays')).filter(
				(a) => a.sampleId === sampleId && a.siteLocation === 'PMC'
			)[0];
			assay = result ?? null;
		}
	}

	async function loadFleetData() {
		if (sampleId) {
			const result = (await indexedDBService.getAllRecords('fleet')).filter(
				(f) => f.sampleId === sampleId
			)[0];
			fleet = result ?? null;
		}
	}

	async function loadTruckLoadData() {
		if (sampleId) {
			const result = (await indexedDBService.getAllRecords('truckLoads')).filter(
				(t) => t.sampleId === sampleId
			)[0];
			truckLoad = result ?? null;
		}
	}

	function handleCancel() {
		goto('/pmc/processes/magnetite-road/gravelotte');
	}

	function handleSubmit() {
		processLayout.setSuccess('Data saved successfully');

		setTimeout(() => {
			goto('/pmc/processes/magnetite-road/gravelotte/sampling');
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
	cancelPath="/pmc/processes/magnetite-road/gravelotte"
>
<!-- t -->

	<div class="space-y-4">
		{#if assay}
			{#if (assay.dedicatedFleet === false && truckLoad)}
				<div class="bg-white p-4 rounded-lg shadow-sm">
					<div class="grid grid-cols-1 gap-4">
						<div>
							<p class="text-sm text-gray-500 font-bold">Truck Registration Nr</p>
							<p class="font-medium">{truckRegistration}</p>
						</div>

						<div>
							<p class="text-sm text-gray-500 font-bold">Sample ID</p>
							<p class="font-medium">{truckLoad.sampleId}</p>
						</div>

						<div>
							<p class="text-sm text-gray-500 font-bold">Product</p>
							<p class="font-medium">{truckLoad.materialType}</p>
						</div>
						
						<div>
							<p class="text-sm text-gray-500 font-bold">Loading Location</p>
							<p class="font-medium">{truckLoad.loadingLocation}</p>
						</div>
					</div>
				</div>
			{:else if (assay.dedicatedFleet === true && fleet)}
				<div class="bg-white p-4 rounded-lg shadow-sm">
					<div class="grid grid-cols-1 gap-4">
						<div>
							<p class="text-sm text-gray-500 font-bold">Truck Registration Nr</p>
							<p class="font-medium">{truckRegistration}</p>
						</div>

						<div>
							<p class="text-sm text-gray-500 font-bold">Sample ID</p>
							<p class="font-medium">{fleet.sampleId}</p>
						</div>

						<div>
							<p class="text-sm text-gray-500 font-bold">Product</p>
							<p class="font-medium">{fleet.commodity}</p>
						</div>
						
						<div>
							<p class="text-sm text-gray-500 font-bold">Loading Location</p>
							<p class="font-medium">{fleet.loadingLocation}</p>
						</div>

						<div>
							<p class="text-sm text-gray-500 font-bold">Loading Time (Hours)</p>
							<p class="font-medium">{fleet.loadingHour}</p>
						</div>
					</div>
				</div>
			{/if}
		{:else}
			<div class="text-center py-8">
				<p class="text-gray-500">Loading sample details...</p>
			</div>
		{/if}
	</div>
</ProcessLayout>