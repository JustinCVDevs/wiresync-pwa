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
	let processLayout: ProcessLayout;
	
	// Process steps
	const processSteps = ['Sample Details', 'Complete'];

	onMount(async () => {
		await loadAssayData();
		await loadTruckData();
	});

	async function loadAssayData() {
		if (sampleId) {
			const result = (await indexedDBService.getAllRecords('assays')).filter(
				(a) => a.sampleId === sampleId && a.siteLocation === 'PMC'
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
			console.log('Truck Data:', truck);
		}
	}

	function handleCancel() {
		goto('/pmc/processes/magnetite-road/gravelotte');
	}

	function handleSubmit() {
		processLayout.setSuccess('Data saved successfully');

		setTimeout(() => {
			goto('/pmc/processes/magnetite-road/gravelotte');
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
		{#if assay && truck}
			{#if assay.dedicatedFleet === false}
				<div class="bg-white p-4 rounded-lg shadow-sm">
					<div class="grid grid-cols-1 gap-4">
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
				<div class="bg-white p-4 rounded-lg shadow-sm">
					<div class="grid grid-cols-1 gap-4">
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
							<p class="font-medium">{truck.loadingLocation}</p>
						</div>

						<div>
							<p class="text-sm text-gray-500 font-bold">Loading Time (Hours)</p>
							<p class="font-medium">{truck.loadingHour}</p>
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