<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay } from '$lib/types/assay';
	import type { Wagon } from '$lib/types/wagon';
	import { ScanBarcode, WashingMachine } from 'lucide-svelte';

	const sampleId = $page.url.searchParams.get('sampleId') || '';
	const wagonId = $page.url.searchParams.get('wagonId') || '';
	let assay: Assay | null = null;
	let wagon: Wagon | null = null;
	let currentStep = 2;
	
	// Process steps
	const processSteps = ['Sample Details', 'Complete'];

	onMount(async () => {
		await loadAssayData();
		await loadWagonData();
	});

	async function loadAssayData() {
		if (sampleId) {
			const result = (await indexedDBService.getAllRecords('assays')).filter(
				(a) => a.sampleId === sampleId
			)[0];
			assay = result ?? null;
		}
	}

	async function loadWagonData() {
		if (wagonId) {
			const result = (await indexedDBService.getAllRecords('wagons')).filter(
				(w) => w.transcoreTag === wagonId
			)[0];
			wagon = result ?? null;
		}
	}

	function handleCancel() {
		goto('/bosveld/processes/loading-station');
	}

	function handleSubmit() {
		goto('/bosveld/processes/complete');
	}

</script>

<ProcessLayout
	title="Sample Details Verification"
	steps={processSteps}
	{currentStep}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
	cancelPath="/bosveld/processes/loading-station"
>
<!-- t -->

	<div class="space-y-4">
		{#if assay && wagon}
			<div class="bg-white p-4 rounded-lg shadow-sm">
				<div class="grid grid-cols-1 gap-4">
					<div>
						<p class="text-sm text-gray-500 font-bold">Wagon ID</p>
						<p class="font-medium">{wagon.transcoreTag}</p>
					</div>

					<div>
						<p class="text-sm text-gray-500 font-bold">Product Selection</p>
						<p class="font-medium">{assay.productType}</p>
					</div>

					<div>
						<p class="text-sm text-gray-500 font-bold">Sample ID</p>
						<p class="font-medium">{assay.name}</p>
					</div>
					
					<div>
						<p class="text-sm text-gray-500 font-bold">Loading Location</p>
						<p class="font-medium">{assay.location}</p>
					</div>

					<div>
						<p class="text-sm text-gray-500 font-bold">Train Number</p>
						<p class="font-medium">{wagon.trainNumber}</p>
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