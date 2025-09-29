<script lang="ts">
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { onMount } from 'svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay, Truck } from '$lib/types';
	import FormField from '$lib/components/FormField.svelte';
	import { syncService } from '$lib/services/syncService';

	let truckRegistration = '';
	let sampleId = '';
	let loadingLocation = 'PMC';
	let error = '';
	let processLayout: ProcessLayout;
	let currentStep = 1;

	const steps = ["Registration", "Verification"];

	let truckOptions: { value: string; label: string }[] = [];

	onMount(async () => {
		// Fetch all truck arrivals
		const truckArrivals = (await indexedDBService.getAllRecords('truckArrivals')).filter(
			arrival => arrival.port_truck_arrival_timestamp && arrival.port_arrival_sample_id === ''
		);

		// Get linked trucks from truck arrivals
		const linkedTrucks = truckArrivals.map(arrival => arrival.truckId);

		// Fetch all trucks
		const allTrucks = (await indexedDBService.getAllRecords('trucks')).filter(
			truck => truck.loadingLocation === 'PMC'
		);

		// Filter trucks that match the truck arrivals' port_arrival_sample_id
		let availableTrucks = allTrucks.filter(truck =>
			truckArrivals.some(arrival => arrival.truckId === truck.serverId)
		);

		truckOptions = availableTrucks.map(truck => ({
			value: truck.registration,
			label: truck.registration
		}));
	});

	function generateSampleId(): string {
		const now = new Date();
		const yyyy = now.getFullYear();
		const mm = String(now.getMonth() + 1).padStart(2, '0');
		const dd = String(now.getDate()).padStart(2, '0');
		return `${yyyy}${mm}${dd}_`;
	}

	onMount(() => {
		// Set initial sample ID
		sampleId = generateSampleId();
	});

	// Update sampleId whenever truckRegistration changes
	$: if (truckRegistration) {
		sampleId = generateSampleId() + truckRegistration;
	}

	async function handleSubmit() {
		try {
			processLayout.setError('');
			processLayout.setSuccess('');

			let findTruck = (await indexedDBService.getAllRecords('trucks')).find(
				(truck: Truck) => truck.registration === truckRegistration
			);

			const assay: Assay = {
				id: crypto.randomUUID(),
				name: sampleId,
				linkedTruckIds: [findTruck?.serverId || ''],
				syncStatus: 'pending',
				location: loadingLocation,
				created: new Date(),
				updated: new Date().toISOString(),
				sampleId: sampleId,
				siteLocation: 'Richards Bay',
			};

			// Save assay to IndexedDB
			await indexedDBService.saveRecord('assays', assay);
			await syncService.syncAssay(assay);

			// Update truck arrival with the sample ID
			const truckArrival = (await indexedDBService.getAllRecords('truckArrivals')).find(
				arrival => arrival.truckId === findTruck?.serverId
			);

			if (truckArrival) {
				await indexedDBService.updateRecord('truckArrivals', truckArrival.id, {
					...truckArrival,
					port_arrival_sample_id: sampleId,
					syncStatus: 'pending',
				});
			}

			goto(`/richardsbay/processes/road/pmc-trucks-sampling/verification?sampleId=${encodeURIComponent(sampleId)}&truckRegistration=${encodeURIComponent(truckRegistration)}`);
		} catch (err) {
			error = 'Failed to submit data';
			console.error(err);
		}
	}
	
	function handleCancel() {
		goto('/richardsbay/processes/road');
	}
</script>

<ProcessLayout
	title="PMC Truck Sampling"
	{steps}
	{currentStep}
	isSubmitting={false}
	bind:this={processLayout}
	cancelPath="/richardsbay/processes/road"
	on:cancel={handleCancel}
	on:submit={handleSubmit}
	on:error={({ detail }) => (error = detail)}
>
	<slot name="header" />

	{#if error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{error}
		</div>
	{/if}

	<h2 class="">Truck Data Capturing</h2>
	<div class='form-field'>
		<FormField
			id="truckRegistration"
			label="Truck Registration"
			bind:value={truckRegistration}
			placeholder="Select Truck Registration"
			isSelect={true}
			options={truckOptions}
			required={true}
		/>
	</div>
	<div class='form-field'>
		<FormField
			id="sampleId"
			label="Sample ID"
			type="text"
			bind:value={sampleId}
			placeholder="Enter Sample ID"
			required
		/>
	</div>
</ProcessLayout>

<style>
	.form-field {
		width: 100%;
		margin-bottom: 1.5rem;
	}
</style>