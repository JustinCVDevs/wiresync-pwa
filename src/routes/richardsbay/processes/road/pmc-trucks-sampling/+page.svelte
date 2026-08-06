<script lang="ts">
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { onMount } from 'svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay, Truck } from '$lib/types';
	import FormField from '$lib/components/FormField.svelte';
	import { syncService } from '$lib/services/syncService';
	import { pocketbaseService } from '$lib/services/pocketbaseService';

	let truckRegistration = '';
	let sampleId = '';
	let loadingLocation = 'PMC';
	let error = '';
	let processLayout: ProcessLayout;
	let currentStep = 1;
	let isSubmitting = false;

	const steps = ["Registration", "Verification"];

	let truckOptions: { value: string; label: string }[] = [];

	onMount(async () => {
		const [allArrivals, allTrucks, allDedicatedTrucks] = await Promise.all([
			indexedDBService.getAllRecords('truckArrivals'),
			indexedDBService.getAllRecords('trucks'),
			indexedDBService.getAllRecords('dedicatedFleetTrucks')
		]);

		const pendingArrivals = allArrivals.filter(
			arrival => arrival.port_truck_arrival_timestamp && arrival.port_arrival_sample_id === ''
		);

		truckOptions = pendingArrivals.flatMap(arrival => {
			const truck =
				allTrucks.find(t => (t.serverId || t.id) === arrival.truckId) ??
				allDedicatedTrucks.find(t => (t.serverId || t.id) === arrival.dedicatedTruckId);
			if (!truck) return [];
			return [{ value: arrival.id, label: truck.registration }];
		});
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
		const registration = truckOptions.find(o => o.value === truckRegistration)?.label ?? truckRegistration;
		sampleId = generateSampleId() + registration;
	}

	async function handleSubmit() {
		try {
			processLayout.setError('');
			processLayout.setSuccess('');
			isSubmitting = true;

			const [allTrucks, allDedicatedTrucks, allArrivals] = await Promise.all([
				indexedDBService.getAllRecords('trucks'),
				indexedDBService.getAllRecords('dedicatedFleetTrucks'),
				indexedDBService.getAllRecords('truckArrivals')
			]);

			const truckArrival = allArrivals.find(a => a.id === truckRegistration || a.serverId === truckRegistration);

			if (!truckArrival) {
				processLayout.setError('Truck arrival not found');
				return;
			}

			const linkedTruck = allTrucks.find((t: Truck) => (t.serverId || t.id) === truckArrival.truckId);
			const linkedDedicatedTruck = !linkedTruck
				? allDedicatedTrucks.find(t => (t.serverId || t.id) === truckArrival.dedicatedTruckId)
				: undefined;

			const assay: Assay = {
				id: crypto.randomUUID(),
				name: sampleId,
				...(linkedTruck ? { linkedTruckIds: [linkedTruck.serverId || ''] } : {}),
				...(linkedDedicatedTruck ? { linkedDedicatedFleetTruckIds: [linkedDedicatedTruck.serverId || ''] } : {}),
				syncStatus: 'pending',
				location: loadingLocation,
				created: new Date(),
				updated: new Date().toISOString(),
				sampleId: sampleId,
				user: pocketbaseService.currentUser?.id || '',
				isWireSynced: false,
				siteLocation: 'Richards Bay',
			};

			// Save assay to IndexedDB
			await indexedDBService.saveRecord('assays', assay);
			await syncService.syncAssay(assay);

			await indexedDBService.updateRecord('truckArrivals', truckArrival.id, {
				...truckArrival,
				port_arrival_sample_id: sampleId,
				syncStatus: 'pending',
				isWireSynced: false
			});

			goto(`/richardsbay/processes/road/pmc-trucks-sampling/verification?sampleId=${encodeURIComponent(sampleId)}&truckRegistration=${encodeURIComponent(truckRegistration)}`);
		} catch (err) {
			error = 'Failed to submit data';
			console.error(err);
		} finally {
			isSubmitting = false;
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
	{isSubmitting}
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
			search={true}
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
		margin-top: 1rem;
		position: relative;
	}
</style>