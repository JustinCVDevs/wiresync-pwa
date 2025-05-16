<script lang="ts">
	import { goto } from '$app/navigation';
	import Camera from '$lib/components/Camera.svelte';
	import { onMount } from 'svelte';

	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { TruckLoad } from '$lib/types/truckLoad';
	import type { Assay } from '$lib/types/assay';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';

	let truckId = '';
	let materialType = '';
	let loadedWeight = '';
	let sampleId = '';
	let showCamera = false;
	let error = '';
	let capturedImage = ''; // Add this line

	const materialTypes = ['HG', 'LG', 'Reverts'];

	// Update the trucks type
	let availableTrucks: { id: string; registration: string; serverId: string }[] = [];

	onMount(async () => {
		// Fetch trucks from IndexedDB
		const trucks = await indexedDBService.getRecords('trucks');
		availableTrucks = trucks;
	});

	async function handleSubmit() {
		try {
			// Create TruckLoad
			const truckLoadId = crypto.randomUUID();
			const truckLoad: TruckLoad = {
				id: truckLoadId,
				truckId: truckId,
				felWeight: loadedWeight,
				created: new Date().toISOString(),
				samplingStatus: true,
				syncStatus: 'pending',
				process: 'Copper Truck Loadout'
			};

			// Create Assay
			const assay: Assay = {
				id: crypto.randomUUID(),
				name: sampleId,
				created: new Date().toISOString(),
				dedicatedFleet: false,
				commodity: 'Copper',
				productType: materialType,
				linkedTruckLoadIds: [truckLoadId],
				syncStatus: 'pending',
				process: 'Copper Truck Loadout'
			};

			// Save both records
			await Promise.all([
				indexedDBService.saveRecord('truckLoads', truckLoad),
				indexedDBService.saveRecord('assays', assay)
			]);

			goto('/pmc/processes');
		} catch (err) {
			console.error('Failed to save records:', err);
			error = 'Failed to save data';
		}
	}

	function handleCapture(event: CustomEvent<string>) {
		capturedImage = event.detail;
		showCamera = false;
	}

	function handleCancel() {
		goto('/pmc/processes');
	}
	const sampleSizes = ['1', '5', '10'];
	const commodities = ['Magnetite', 'Mag-64%', 'Mag-65%', 'Iron Oxide'];
	const productTypes = ['Course', 'DMS', 'Iron Oxide', 'Magnetite', 'Mag-64%', 'Mag-65%'];
	const steps = [
		"Sample Details",
		"Truck Details",
		"Complete"
	];
	let currentStep = 1;
</script>
<ProcessLayout
title="Copper Truck Loadout"
processKey="copper_truck_loadout"
{steps}
{currentStep}
isSubmitting={false}
cancelPath="/processes"
on:cancel={() => goto('/pmc/processes')}
on:submit={handleSubmit}
>
	<h1>Copper Truck Loadout</h1>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	<div class="form bg-white text-gray p-4 rounded-lg flex flex-col gap-4">
		<div class="input-group">
			<label for="truckRegistration">Truck Registration</label>
			<select id="truckRegistration" bind:value={truckId} required>
				<option value="">Select Truck Registration</option>
				{#each availableTrucks as truck}
					<option value={truck.serverId}>{truck.registration}</option>
				{/each}
			</select>
	
		</div>

		<Camera {showCamera} on:capture={handleCapture} on:close={() => (showCamera = false)} />

		<div class="input-group">
			<label for="materialType">Material Type</label>
			<select id="materialType" bind:value={materialType} required>
				<option value="">Select Material Type</option>
				{#each materialTypes as type}
					<option value={type}>{type}</option>
				{/each}
			</select>
		</div>

		<div class="input-group">
			<label for="loadedWeight">Loaded Weight (kg)</label>
			<input
				id="loadedWeight"
				type="number"
				bind:value={loadedWeight}
				placeholder="Enter loaded weight"
				required
			/>
		</div>

		<div class="input-group">
			<label for="sampleId">Sample ID</label>
			<input
				id="sampleId"
				type="text"
				bind:value={sampleId}
				placeholder="Enter Sample ID"
				required
			/>
		</div>

		<div class="button-group">
			<button class="cancel-button" on:click={handleCancel}>Cancel</button>
			<button class="submit-button" on:click={handleSubmit}>Submit</button>
		</div>
	</div>
</ProcessLayout>