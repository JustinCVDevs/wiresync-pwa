<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	// Add TruckLoad type import at the top
	import type { Assay, Truck } from '$lib/types';
	import type { TruckLoad } from '$lib/types/truckLoad';

	const assayId = $page.url.searchParams.get('assayId') || '';
	let assay: Assay | undefined;
	let selectedTruck = '';
	let felWeight = '';
	let samplingStatus: 'Yes' | 'No' = 'No';
	let loadingLocation = '';
	let loadingHour = '';
	let availableTrucks: Truck[] = [];
	let error = '';
	let isLoading = true;

	async function loadData() {
		try {
			// Load assay data
			const assayData = await indexedDBService.getRecord('assays', assayId);
			if (!assayData) {
				error = 'Assay not found';
				return;
			}
			assay = assayData;

			// Load available trucks
			const trucks = await indexedDBService.getAllRecords('trucks');
			availableTrucks = trucks;
		} catch (err) {
			error = 'Failed to load data';
			console.error(err);
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		if (assayId) {
			loadData();
		}
	});

	const loadingLocations = ['West Load Out', 'East Load Out', 'Gravelotte', 'TLO'];

	// Add validation function at the top of the script
	function validateLoadingHour(value: string) {
		const hour = parseInt(value);
		return !isNaN(hour) && hour >= 0 && hour <= 23;
	}

	async function handleSubmit() {
		try {
			if (!assay) return;
			if (!validateLoadingHour(loadingHour)) {
				error = 'Loading hour must be between 00 and 23';
				return;
			}

			const truckLoad: TruckLoad = {
				id: crypto.randomUUID(),
				truckId: selectedTruck,
				felWeight: felWeight,
				samplingStatus: samplingStatus === 'Yes',
				loadingLocation,
				loadingHour,
				process: 'Truck Loadout',
				syncStatus: 'pending',
				created: new Date().toISOString(),
				updated: new Date().toISOString()
			};

			// Save truckLoad to IndexedDB
			await indexedDBService.saveRecord('truckLoads', truckLoad);

			// Update assay with new truckLoad ID
			const updatedAssay: Assay = {
				...assay,
				syncStatus: 'pending',
				linkedTruckLoadIds: [...(assay.linkedTruckLoadIds || []), truckLoad.id].filter(
					(id): id is string => id !== undefined
				),
				updated: new Date().toISOString()
			};
			await indexedDBService.saveRecord('assays', updatedAssay);

			goto(`/processes/truck-loadout/add-trucks?assayId=${assay.id}`);
		} catch (err) {
			error = 'Failed to submit truck data';
			console.error(err);
		}
	}

	function handleCancel() {
		goto('/processes');
	}
</script>

<div class="container">
	<h1>Add New Truck</h1>
	{#if assay}
		<p class="sample-id">Sample ID: {assay.name}</p>
	{/if}

	{#if error}
		<div class="error">{error}</div>
	{/if}

	{#if isLoading}
		<div class="text-center">Loading...</div>
	{:else}
		<div class="form">
			<div class="input-group">
				<label for="truckRegistration">Truck Registration</label>
				<select id="truckRegistration" bind:value={selectedTruck} required>
					<option value="">Select Truck Registration</option>
					{#each availableTrucks as truck}
						<option value={truck.serverId}>{truck.registration}</option>
					{/each}
				</select>
			</div>

			<div class="input-group">
				<label for="felWeight">FEL Weight (kg)</label>
				<input
					id="felWeight"
					type="number"
					bind:value={felWeight}
					placeholder="Enter FEL Weight"
					required
				/>
			</div>

			<div class="input-group">
				<label>Sample Status</label>
				<div class="radio-group">
					<label class="radio-button">
						<input type="radio" name="samplingStatus" value="Yes" bind:group={samplingStatus} />
						<span class="radio-label">Yes</span>
					</label>
					<label class="radio-button">
						<input type="radio" name="samplingStatus" value="No" bind:group={samplingStatus} />
						<span class="radio-label">No</span>
					</label>
				</div>
			</div>

			<div class="input-group">
				<label for="loadingLocation">Loading Location</label>
				<select id="loadingLocation" bind:value={loadingLocation} required>
					<option value="">Select Loading Location</option>
					{#each loadingLocations as location}
						<option value={location}>{location}</option>
					{/each}
				</select>
			</div>

			<div class="input-group">
				<label for="loadingHour">Loading Hour (00-23)</label>
				<input
					id="loadingHour"
					type="text"
					bind:value={loadingHour}
					maxlength="2"
					pattern="[0-9]*"
					placeholder="Enter hour (00-23)"
					required
				/>
			</div>

			<div class="button-group">
				<button class="cancel-button" on:click={handleCancel}>Cancel</button>
				<button class="submit-button" on:click={handleSubmit}>Submit</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem;
	}

	.sample-id {
		font-size: 1.2rem;
		margin-bottom: 2rem;
		font-weight: bold;
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

	.radio-group {
		display: flex;
		gap: 1rem;
		margin-top: 0.5rem;
	}

	.radio-button {
		flex: 1;
		position: relative;
		margin: 0;
		padding: 0;
		cursor: pointer;
	}

	.radio-button input {
		position: absolute;
		opacity: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		cursor: pointer;
	}

	.radio-label {
		display: block;
		padding: 1rem;
		text-align: center;
		background-color: #f5f5f5;
		border: 2px solid #ddd;
		border-radius: 8px;
		font-size: 1.1rem;
		font-weight: bold;
		transition: all 0.2s ease;
	}

	.radio-button input:checked + .radio-label {
		background-color: #2196f3;
		color: white;
		border-color: #1976d2;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.radio-button:hover .radio-label {
		background-color: #e0e0e0;
	}

	.radio-button input:checked:hover + .radio-label {
		background-color: #1976d2;
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
</style>
