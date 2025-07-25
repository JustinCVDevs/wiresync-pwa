<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';

	const wagonId = $page.url.searchParams.get('wagonId') || '';
	let wagon: any | null = null;
	let currentStep = 2;
	let processLayout: ProcessLayout;
	
	// Process steps
	const processSteps = ['FEL Weight Capturing', 'Complete'];

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
		goto('/bosveld/processes');
	}

	function handleSubmit() {
		processLayout.setSuccess('Data saved successfully');

		setTimeout(() => {
			goto('/bosveld/processes/loading-station/fel-operations');
		}, 1000);
	}
</script>

<ProcessLayout
	title="Sample Details Verification"
	steps={processSteps}
	{currentStep}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
	cancelPath="/bosveld/processes"
	bind:this={processLayout}
>
<!-- t -->

	<div class="space-y-4">
		{#if wagon}
			<div class="bg-white p-4 rounded-lg shadow-sm">
				<h6 class="text-lg font-semibold mb-2">Transaction Details</h6>
				<div class="grid grid-cols-1 gap-4">
					<div>
						<p class="text-sm text-gray-500 font-bold">Wagon ID</p>
						<p class="font-medium">{wagon.wagonId}</p>
					</div>
					<div>
						<p class="text-sm text-gray-500 font-bold">FEL Weight (Ton)</p>
						<p class="font-medium">{wagon.felWeight}</p>
					</div>
					<div>
						<p class="text-sm text-gray-500 font-bold">Loading Location</p>
						<p class="font-medium">{wagon.loadingLocation}</p>
					</div>
				</div>
			</div>
		{:else}
			<div class="text-center py-8">
				<p class="text-gray-500">Loading wagon details...</p>
			</div>
		{/if}
	</div>
</ProcessLayout>