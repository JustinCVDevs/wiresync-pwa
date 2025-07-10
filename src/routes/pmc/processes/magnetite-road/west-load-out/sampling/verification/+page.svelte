<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay } from '$lib/types/assay';
	import type { Truck } from '$lib/types/truck';

	const sampleId = $page.url.searchParams.get('sampleId') || '';
	const truckRegistration = $page.url.searchParams.get('truckRegistration') || '';
	let assay: Assay | null = null;
	let truck: Truck | null = null;
	let currentStep = 2;
	
	// Process steps
	const processSteps = ['Sample Details', 'Complete'];

	onMount(async () => {
		await loadAssayData();
		await loadTruckData();
	});

	async function loadAssayData() {
		if (sampleId) {
			const result = (await indexedDBService.getAllRecords('assays')).filter(
				(a) => a.sampleId === sampleId
			)[0];
			assay = result ?? null;
		}
	}

	async function loadTruckData() {
		if (truckRegistration) {
			const result = (await indexedDBService.getAllRecords('trucks')).filter(
				(t) => t.registration === truckRegistration
			)[0];
			truck = result ?? null;
		}
	}

	function handleCancel() {
		goto('/pmc/processes/magnetite-road/west-load-out');
	}

	function handleSubmit() {
		goto('/pmc/processes/complete');
	}

</script>

<ProcessLayout
	title="  Sample Details Verification"
	steps={processSteps}
	{currentStep}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
	cancelPath="/pmc/processes/magnetite-road/west-load-out"
>
<!-- t -->

	<div class="space-y-4">
		{#if assay && truck}
			<div class="bg-white p-4 rounded-lg shadow-sm">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<p class="text-sm text-gray-500 font-bold">Truck Registration Nr</p>
						<p class="font-medium">{truck.registration}</p>
					</div>

					<div>
						<p class="text-sm text-gray-500 font-bold">Sample ID</p>
						<p class="font-medium">{assay.sampleId}</p>
					</div>

					<div>
						<p class="text-sm text-gray-500 font-bold">Product</p>
						<p class="font-medium">{assay.productType}</p>
					</div>
					
					<div>
						<p class="text-sm text-gray-500 font-bold">Loading Location</p>
						<p class="font-medium">{assay.location}</p>
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