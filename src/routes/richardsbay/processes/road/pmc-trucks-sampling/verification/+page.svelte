<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { TruckArrival, Truck } from '$lib';

	const sampleId = $page.url.searchParams.get('sampleId') || '';
	let truckArrival: TruckArrival | null = null;
	let truck: any = null;
	let currentStep = 2;
	let processLayout: ProcessLayout;
	
	// Process steps
	const processSteps = ['Registration', 'Verification'];

	onMount(async () => {
		if (!sampleId) return;

		const [allArrivals, allTrucks, allDedicatedTrucks] = await Promise.all([
			indexedDBService.getAllRecords('truckArrivals'),
			indexedDBService.getAllRecords('trucks'),
			indexedDBService.getAllRecords('dedicatedFleetTrucks')
		]);

		truckArrival = allArrivals.find(a => a.port_arrival_sample_id === sampleId) ?? null;

		if (truckArrival) {
			truck =
				allTrucks.find(t => (t.serverId || t.id) === truckArrival?.truckId) ??
				allDedicatedTrucks.find(t => (t.serverId || t.id) === truckArrival?.dedicatedTruckId) ??
				null;
		}
	});

	function handleCancel() {
		goto('/richardsbay/processes/road');
	}

	function handleSubmit() {
		processLayout.setSuccess('Data saved successfully');

		setTimeout(() => {
			goto('/richardsbay/processes/road/pmc-trucks-sampling');
		}, 1000);
	}

</script>

<ProcessLayout
	title="PMC Truck Sampling"
	steps={processSteps}
	{currentStep}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
	bind:this={processLayout}
	cancelPath="/richardsbay/processes/road"
>
	<div class="space-y-4">
		{#if truckArrival}
			<div class="bg-white p-4 rounded-lg shadow-sm">
				<div class="grid grid-cols-1 gap-4">
					<div>
						<p class="text-sm text-gray-500 font-bold">Truck Registration Nr</p>
						<p class="font-medium">{truck?.registration ?? 'N/A'}</p>
					</div>

					<div>
						<p class="text-sm text-gray-500 font-bold">Sample ID</p>
						<p class="font-medium">{truckArrival.port_arrival_sample_id}</p>
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