<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { TruckArrival, Truck } from '$lib';

	const truckArrivalId = $page.url.searchParams.get('truckArrivalId') || '';
	let truckArrival: TruckArrival | null = null;
	let truck: Truck | null = null;
	let currentStep = 2;
	let processLayout: ProcessLayout;
	
	// Process steps
	const processSteps = ['Registration', 'Verification'];

	onMount(async () => {
		await loadTruckArrivalData();
	});

	async function loadTruckArrivalData() {
		if (truckArrivalId) {
			const result = (await indexedDBService.getAllRecords('truckArrivals')).find(
				(a) => a.id === truckArrivalId || a.serverId === truckArrivalId
			);
			truckArrival = result ?? null;

			let linkedTruck = (await indexedDBService.getAllRecords('trucks')).find(
				(t) => t.id === truckArrival?.truckId || t.serverId === truckArrival?.truckId
			);
			
			if (!linkedTruck) {
				linkedTruck = (await indexedDBService.getAllRecords('dedicatedFleetTrucks')).find(
					(t) => t.id === truckArrival?.dedicatedTruckId || t.serverId === truckArrival?.dedicatedTruckId
				);
			}

			truck = linkedTruck ?? null;
		}
	}

	function formatTimestamp(date: Date) {
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		const dd = String(date.getDate()).padStart(2, '0');
		const hh = String(date.getHours()).padStart(2, '0');
		const min = String(date.getMinutes()).padStart(2, '0');
		return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
	}

	function handleCancel() {
		goto('/bosveld/processes/truck-arrival');
	}

	function handleSubmit() {
		processLayout.setSuccess('Truck has successfully been received.');

		setTimeout(() => {
			goto('/bosveld/processes/truck-arrival');
		}, 1000);
	}

</script>

<ProcessLayout
	title="Bosveld Truck Arrival"
	steps={processSteps}
	{currentStep}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
	bind:this={processLayout}
	cancelPath="/bosveld/processes/truck-arrival"
>
	<div class="space-y-4">
		{#if truckArrival}
			<div class="bg-white p-4 rounded-lg shadow-sm">
				<div class="grid grid-cols-1 gap-4">
					<div>
						<p class="text-sm text-gray-500 font-bold">Truck Registration Nr</p>
						<p class="font-medium">{truck?.registration}</p>
					</div>

					<div>
						<p class="text-sm text-gray-500 font-bold">Arrival Timestamp</p>
						<p class="font-medium">{formatTimestamp(new Date(truckArrival.port_truck_arrival_timestamp ?? ''))}</p>
					</div>

					<div>
						<p class="text-sm text-gray-500 font-bold">Truck Photo</p>
						<!-- svelte-ignore a11y_img_redundant_alt -->
						<img class="max-w-xs rounded shadow" src={truckArrival.truck_photo} alt="Truck Photo"/>
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