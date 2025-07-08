<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay } from '$lib/types/assay';
	import { ScanBarcode, WashingMachine } from 'lucide-svelte';
	import { get } from 'svelte/store';

	const sampleId = $page.url.searchParams.get('sampleId') || '';
	let assay: Assay | null = null;
	let currentStep = 2;
	
	// Process steps
	const processSteps = ['Sample Details', 'FEL Weight Capturing', 'Complete'];

	onMount(async () => {
		await loadAssayData();
	});

	async function loadAssayData() {
		if (sampleId) {
			const result = await indexedDBService.getAssayById(sampleId);
			assay = result ?? null;
		}
	}

	function handleNewWagon() {
		goto(`/bosveld/processes/west-loadout/fel-weight-capturing?sampleId=${sampleId}`);
	}

	function handleCancel() {
		goto('/bosveld/processes');
	}
</script>

<ProcessLayout
	title="  Sample Details Verification"
	steps={processSteps}
	{currentStep}
	on:cancel={handleCancel}
	showSubmit={!!(assay?.linkedWagonIds?.length)}
	cancelPath="/bosveld/processes"
>
<!-- t -->

	<div class="space-y-4">
		{#if assay}
			<div class="bg-white p-4 rounded-lg shadow-sm">
				<h6 class="text-lg font-semibold mb-2">Transaction Details</h6>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<p class="text-sm text-gray-500 font-bold">Sample ID</p>
						<p class="font-medium">{assay.name}</p>
					</div>
					<div>
						<p class="text-sm text-gray-500 font-bold">Product Grade</p>
						<p class="font-medium">{assay.productGrade}</p>
					</div>

					<div>
						<p class="text-sm text-gray-500 font-bold">Consignment</p>
						<p class="font-medium">{get(page).url.searchParams.get('consignment') ?? ''}</p>
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

		

		<div class="flex justify-center mt-4">
		
		
			<button 
			class="new-button hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md flex items-center"
			on:click={handleNewWagon}
		>
			<span class="mr-2">+ Add Wagon </span>
			<ScanBarcode size="16"/> 
		</button>
		</div>
	</div>
</ProcessLayout>