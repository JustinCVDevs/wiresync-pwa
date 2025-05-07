<script lang="ts">
	import { goto } from '$app/navigation';

	let sampleId = '';
	let productGrade = '';
	let error = '';

	const productGrades = ['Iron Oxide', 'Magnetite', 'Mag-64', 'Mag-65'];

	async function handleSubmit() {
		try {
			// Mock successful API response
			const mockResponse = {
				success: true,
				data: {
					name: sampleId,
					productGrade,
					componentType: 'ASSAY',
					timestamp: new Date().toISOString()
				}
			};

			// Store in localStorage for demo purposes
			localStorage.setItem('currentAssay', JSON.stringify(mockResponse.data));

			// Navigate to next page
			goto('/processes/east-loadout/wagon-details?sampleId=' + sampleId);
		} catch (err) {
			error = 'Failed to create assay';
		}
	}

	function handleCancel() {
		goto('/processes');
	}
</script>

<div class="container">
	<h1>East Loadout - Train Details</h1>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	<div class="form">
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
			<label for="productGrade">Product Grade</label>
			<select id="productGrade" bind:value={productGrade} required>
				<option value="">Select Product Grade</option>
				{#each productGrades as grade}
					<option value={grade}>{grade}</option>
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
