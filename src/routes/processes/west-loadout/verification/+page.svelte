<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay } from '$lib/types/assay';

	const sampleId = $page.url.searchParams.get('sampleId') || '';
	let assay: Assay | null = null;
	let currentStep = 2;
	
	// Process steps
	const processSteps = ['Train Details', 'Sample Details Verification', 'FEL Weight Capturing', 'Wagon Review'];

	onMount(async () => {
		await loadAssayData();
	});

	async function loadAssayData() {
		if (sampleId) {
			assay = await indexedDBService.getAssayById(sampleId);
		}
	}

	function handleNewWagon() {
		goto(`/processes/west-loadout/fel-weight-capturing?sampleId=${sampleId}`);
	}

	function handleCancel() {
		goto('/processes');
	}
</script>

<ProcessLayout
	title="West Loadout - Sample Details Verification"
	processKey="west_loadout"
	steps={processSteps}
	{currentStep}
	showActions={false}
>
	<div slot="header">
		<h5 class="text-xl font-bold ">Sample Details Verification</h5>
		<p class="text-sm text-gray-600">Please review the sample details</p>
	</div>

	<div class="space-y-4">
		{#if assay}
			<div class="bg-white p-4 rounded-lg shadow-sm">
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
					{#if assay.consignment}
					<div>
						<p class="text-sm text-gray-500">Consignment</p>
						<p class="font-medium">{assay.consignment}</p>
					</div>
					{/if}
					<div>
						<p class="text-sm text-gray-500">Loading Location</p>
						<p class="font-medium">{assay.location}</p>
					</div>
				</div>
			</div>
		{:else}
			<div class="text-center py-8">
				<p class="text-gray-500">Loading sample details...</p>
			</div>
		{/if}

		<div class="flex justify-center mt-6">
			<button 
				class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md flex items-center"
				on:click={handleNewWagon}
			>
				<span class="mr-2">+ NEW Wagon</span>
			</button>
		</div>

		<div class="flex justify-center mt-4">
			<button 
				class="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-6 rounded-md"
				on:click={handleCancel}
			>
				Cancel
			</button>
		</div>
	</div>
</ProcessLayout>