<script lang="ts">
	import { goto } from '$app/navigation';
	import Camera from '$lib/components/Camera.svelte';
	import { onMount } from 'svelte';

	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { TruckLoad } from '$lib/types/truckLoad';
	import type { Assay } from '$lib/types/assay';

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

			goto('/processes');
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
		goto('/processes');
	}
</script>

<div class="container">
	<h1>Copper Truck Loadout</h1>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	<div class="form">
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
</div>

<style>
	.container {
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem;
	}

	.form {
		margin-top: 2rem;
	}

	.input-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: bold;
	}

	input,
	select {
		width: 100%;
		padding: 0.75rem;
		font-size: 1.1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	.button-group {
		display: flex;
		gap: 1rem;
		margin-top: 2rem;
	}

	button {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		color: white;
	}

	.camera-button {
		background-color: #2196f3;
		margin-top: 0.5rem;
	}

	.submit-button {
		background-color: #4caf50;
	}

	.cancel-button {
		background-color: #f44336;
	}

	.error {
		background-color: #ffebee;
		color: #c62828;
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.captured-image {
		margin-top: 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		overflow: hidden;
	}

	.captured-image img {
		width: 100%;
		height: auto;
		display: block;
	}
</style>
