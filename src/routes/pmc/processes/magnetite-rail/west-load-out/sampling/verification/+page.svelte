<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay } from '$lib/types/assay';
	import type { Wagon } from '$lib/types/wagon';

	let processLayout: ProcessLayout;
	const wagonId = $page.url.searchParams.get('wagonId') || '';
	let wagon: Wagon | null = null;
	let currentStep = 2;
	
	// Process steps
	const processSteps = ['Sample Details', 'Complete'];

	onMount(async () => {
		await loadWagonData();
	});

	async function loadWagonData() {
		if (wagonId) {
			const result = (await indexedDBService.getAllRecords('wagons')).filter(
				(w) => w.wagonId === wagonId
			)[0];
			wagon = result ?? null;
		}
	}

	function handleCancel() {
		goto('/pmc/processes/magnetite-rail/west-load-out');
	}

	function handleSubmit() {
		processLayout.setSuccess('Data saved successfully');

		setTimeout(() => {
			goto('/pmc/processes/magnetite-rail/west-load-out/sampling');
		}, 1000);
	}

</script>

<ProcessLayout
	title="  Sample Details Verification"
	steps={processSteps}
	{currentStep}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
	cancelPath="/pmc/processes/magnetite-rail/west-load-out"
	bind:this={processLayout}
>
<!-- t -->

	<div class="space-y-4">
		{#if wagon}
			<div class="bg-white p-4 rounded-lg shadow-sm">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<p class="text-sm text-gray-500 font-bold">Wagon ID</p>
						<p class="font-medium">{wagon.wagonId}</p>
					</div>

					<div>
						<p class="text-sm text-gray-500 font-bold">Product Selection</p>
						<p class="font-medium">{wagon.productType}</p>
					</div>

					<div>
						<p class="text-sm text-gray-500 font-bold">Train Number</p>
						<p class="font-medium">{wagon.trainNumber}</p>
					</div>
					
					<div>
						<p class="text-sm text-gray-500 font-bold">Loading Location</p>
						<p class="font-medium">{wagon.loadingLocation}</p>
					</div>

					<div>
						<p class="text-sm text-gray-500 font-bold">Sample ID</p>
						<p class="font-medium">{wagon.sampleId}</p>
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