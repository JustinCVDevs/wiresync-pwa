<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Fleet } from '$lib/types/fleet';
	import type { TruckLoad } from '$lib';
	import { AwardIcon } from 'lucide-svelte';

	const truckRegistration = $page.url.searchParams.get('truckRegistration') || '';
	const sampleId = $page.url.searchParams.get('sampleId') || '';
	const fleetServerId = $page.url.searchParams.get('fleetServerId') || '';
	let truckLoad: TruckLoad | null = null;
	let fleet: Fleet | null = null;
	let currentStep = 2;
	let processLayout: ProcessLayout;
	
	// Process steps
	const processSteps = ['Sample Details', 'Complete'];

	onMount(async () => {
		await loadtruckLoadData();
		await loadFleetData();
	});

	async function loadtruckLoadData() {
		if (sampleId) {
			const result = (await indexedDBService.getAllRecords('truckLoads')).filter(
				(t) => t.sampleId === sampleId
			)[0];
			truckLoad = result ?? null;
		}
	}

	async function loadFleetData() {
		if (fleetServerId) {
			const result = (await indexedDBService.getAllRecords('fleet')).filter(
				(f) => f.serverId === fleetServerId
			)[0];
			fleet = result ?? null;
		}
	}

	function handleCancel() {
		goto('/pmc/processes/magnetite-road/west-load-out');
	}

	function handleSubmit() {
		processLayout.setSuccess('Data saved successfully');

		setTimeout(() => {
			goto('/pmc/processes/magnetite-road/west-load-out/fel-operations');
		}, 1000);
	}

</script>

<ProcessLayout
	title="Sample Details Verification"
	steps={processSteps}
	{currentStep}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
	cancelPath="/pmc/processes/magnetite-road/west-load-out"
	bind:this={processLayout}
>
	<div class="space-y-4">
		{#if fleet}
				<div class="bg-white p-4 rounded-lg shadow-sm">
					<div class="grid grid-cols-1 gap-4">
						<div>
							<p class="text-sm text-gray-500 font-bold">Truck Registration Nr</p>
							<p class="font-medium">{truckRegistration}</p>
						</div>

						<div>
							<p class="text-sm text-gray-500 font-bold">FEL Weight (Ton)</p>
							<p class="font-medium">{fleet.felMassKg}</p>
						</div>
						
						<div>
							<p class="text-sm text-gray-500 font-bold">Loading Location</p>
							<p class="font-medium">{fleet.loadingLocation}</p>
						</div>
					</div>
				</div>
		{:else if truckLoad}
				<div class="bg-white p-4 rounded-lg shadow-sm">
					<div class="grid grid-cols-1 gap-4">
						<div>
							<p class="text-sm text-gray-500 font-bold">Truck Registration Nr</p>
							<p class="font-medium">{truckRegistration}</p>
						</div>

						<div>
							<p class="text-sm text-gray-500 font-bold">FEL Weight (Ton)</p>
							<p class="font-medium">{truckLoad.felWeight}</p>
						</div>
						
						<div>
							<p class="text-sm text-gray-500 font-bold">Loading Location</p>
							<p class="font-medium">{truckLoad.loadingLocation}</p>
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