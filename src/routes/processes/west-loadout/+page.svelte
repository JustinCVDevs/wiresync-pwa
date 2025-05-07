<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay } from '$lib/types/assay';

	interface Consignment {
		name: string;
	}

	let sampleId = '';
	let productGrade = '';
	let consignment = '';
	let loadingLocation = 'West Load Out';
	let consignments: string[] = [];
	let error = '';

	const productGrades = ['Iron Oxide', 'Magnetite', 'Mag-64', 'Mag-65'];

	const loadingLocations = ['East Load Out', 'West Load Out', 'Bosveld'];

	onMount(async () => {
		try {
			const response = await fetch('/api/wire/consignments');
			const data: Consignment[] = await response.json();
			consignments = data.map((c) => c.name);
		} catch (err) {
			error = 'Failed to load consignments';
		}
	});

	async function handleSubmit() {
		try {
			// Create the assay object according to the Assay interface
			const assay: Assay = {
				id: crypto.randomUUID(),
				name: sampleId,
				productGrade: productGrade,
				location: loadingLocation,
				created: new Date().toISOString(),
				updated: new Date().toISOString(),
				linkedWagonIds: [],
				linkedTruckIds: []
			};

			// Save to IndexedDB
			await indexedDBService.saveRecord('assays', assay);

			// Try to sync with backend if online
			try {
				const response = await fetch('/api/wire/assays', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(assay)
				});

				if (!response.ok) {
					console.warn('Failed to sync with backend, but data saved locally');
				}
			} catch (err) {
				console.warn('Failed to sync with backend, but data saved locally');
			}

			// Navigate to review page instead of wagon details
			goto('/processes/west-loadout/review?sampleId=' + assay.id);
		} catch (err) {
			error = 'Failed to save assay data';
			console.error(err);
		}
	}

	function handleCancel() {
		goto('/processes');
	}
</script>

<div class="container">
	<h1>West Loadout - Train Details</h1>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	<div class="form">
		<div class="input-group">
			<label for="sampleId">Sample ID</label>
			<input id="sampleId" type="text" bind:value={sampleId} placeholder="Enter Sample ID" />
		</div>

		<div class="input-group">
			<label for="productGrade">Product Grade</label>
			<select id="productGrade" bind:value={productGrade}>
				<option value="">Select Product Grade</option>
				{#each productGrades as grade}
					<option value={grade}>{grade}</option>
				{/each}
			</select>
		</div>

		<div class="input-group">
			<label for="consignment">Consignment Number</label>
			<select id="consignment" bind:value={consignment}>
				<option value="">Select Consignment</option>
				{#each consignments as number}
					<option value={number}>{number}</option>
				{/each}
			</select>
		</div>

		<div class="input-group">
			<label for="loadingLocation">Loading Location</label>
			<select id="loadingLocation" bind:value={loadingLocation}>
				{#each loadingLocations as location}
					<option value={location}>{location}</option>
				{/each}
			</select>
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
