<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Camera from '$lib/components/Camera.svelte';

	let truckRegistration = '';
	let tankLocation = '';
	let acidType = '';
	let sampleId = '';
	let showCamera = false;
	let error = '';
	let availableTrucks: string[] = [];
	let capturedImage = '';

	const tankLocations = ['Tank 1', 'Tank 2', 'Tank 3', 'Tank 4'];
	const acidTypes = ['Weak Acid', 'Strong Acid'];

	onMount(async () => {
		// Mock truck registrations (replace with API call later)
		availableTrucks = ['ACD001', 'ACD002', 'ACD003', 'ACD004', 'ACD005'];
	});

	async function handleSubmit() {
		try {
			const truckData = {
				truckRegistration,
				tankLocation,
				acidType,
				sampleId,
				image: capturedImage,
				timestamp: new Date().toISOString(),
				componentType: 'TRUCK'
			};

			// Store in localStorage for demo
			localStorage.setItem('currentAcidTruck', JSON.stringify(truckData));

			goto('/processes/acid-truck/review');
		} catch (err) {
			error = 'Failed to submit data';
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
	<h1>Acid Truck Details</h1>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	<div class="form">
		<div class="input-group">
			<label for="truckRegistration">Truck Registration</label>
			<select id="truckRegistration" bind:value={truckRegistration} required>
				<option value="">Select Truck Registration</option>
				{#each availableTrucks as truck}
					<option value={truck}>{truck}</option>
				{/each}
			</select>
			<button class="camera-button" on:click={() => (showCamera = true)}> Open Camera </button>
			{#if capturedImage}
				<div class="captured-image">
					<img src={capturedImage} alt="Captured truck registration" />
				</div>
			{/if}
		</div>

		<Camera {showCamera} on:capture={handleCapture} on:close={() => (showCamera = false)} />

		<div class="input-group">
			<label for="tankLocation">Tank Loaded From</label>
			<select id="tankLocation" bind:value={tankLocation} required>
				<option value="">Select Tank</option>
				{#each tankLocations as tank}
					<option value={tank}>{tank}</option>
				{/each}
			</select>
		</div>

		<div class="input-group">
			<label for="acidType">Acid Type</label>
			<select id="acidType" bind:value={acidType} required>
				<option value="">Select Acid Type</option>
				{#each acidTypes as type}
					<option value={type}>{type}</option>
				{/each}
			</select>
		</div>

		<div class="input-group">
			<label for="sampleId">Sample ID (Optional)</label>
			<input
				id="sampleId"
				type="text"
				bind:value={sampleId}
				placeholder="Enter Sample ID if applicable"
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

	.error {
		background-color: #ffebee;
		color: #c62828;
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}
</style>
