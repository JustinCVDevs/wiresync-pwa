<script lang="ts">
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay } from '$lib/types';

	let isDedicatedFleet: 'Yes' | 'No' = 'No';
	let sampleId = '';
	let sampleSize = '';
	let commodity = '';
	let productType = '';
	let error = '';

	const sampleSizes = ['10kg', '20kg', '30kg', '40kg', '50kg'];
	const commodities = ['Magnetite', 'Mag-64%', 'Mag-65%', 'Iron Oxide'];
	const productTypes = ['Course', 'DMS', 'Iron Oxide', 'Magnetite', 'Mag-64%', 'Mag-65%'];

	async function handleSubmit() {
		try {
			const assay: Assay = {
				id: crypto.randomUUID(),
				name: sampleId,
				sampleSize,
				commodity,
				productType,
				dedicatedFleet: isDedicatedFleet === 'Yes', // Convert to boolean
				syncStatus: 'pending',
				created: new Date().toISOString(),
				updated: new Date().toISOString(),
				process: 'Gravelotte'
			};

			// Save assay to IndexedDB
			await indexedDBService.saveRecord('assays', assay);
			
			goto(`/processes/gravelotte/add-trucks?assayId=${assay.id}`);
		} catch (err) {
			error = 'Failed to submit data';
			console.error(err);
		}
	}

	function handleCancel() {
		goto('/processes');
	}
</script>

<div class="container">
	<h1>Gravelotte - Data Capturing</h1>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	<div class="form">
		<div class="input-group">
			<label>Dedicated Fleet</label>
			<div class="radio-group">
				<label class="radio-button">
					<input type="radio" name="dedicatedFleet" value="Yes" bind:group={isDedicatedFleet} />
					<span class="radio-label">Yes</span>
				</label>
				<label class="radio-button">
					<input type="radio" name="dedicatedFleet" value="No" bind:group={isDedicatedFleet} />
					<span class="radio-label">No</span>
				</label>
			</div>
		</div>

		{#if isDedicatedFleet === 'No'}
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

			<div class="input-group">
				<label for="sampleSize">Sample Size</label>
				<select id="sampleSize" bind:value={sampleSize} required>
					<option value="">Select Sample Size</option>
					{#each sampleSizes as size}
						<option value={size}>{size}</option>
					{/each}
				</select>
			</div>

			<div class="input-group">
				<label for="commodity">Commodity</label>
				<select id="commodity" bind:value={commodity} required>
					<option value="">Select Commodity</option>
					{#each commodities as item}
						<option value={item}>{item}</option>
					{/each}
				</select>
			</div>

			<div class="input-group">
				<label for="productType">Product Type</label>
				<select id="productType" bind:value={productType} required>
					<option value="">Select Product Type</option>
					{#each productTypes as type}
						<option value={type}>{type}</option>
					{/each}
				</select>
			</div>
		{/if}

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
