<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Camera from '$lib/components/Camera.svelte';

	const sampleId = $page.url.searchParams.get('sampleId') || '';
	let wagonId = '';
	let rfidTag = '';
	let samplingStatus: 'Yes' | 'No' = 'No';
	let showCamera = false;
	let error = '';

	async function handleSubmit() {
		try {
			const response = await fetch('/api/wire/wagons', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					wagonId,
					rfidTag,
					samplingStatus,
					sampleId,
					componentType: 'WAGON'
				})
			});

			if (response.ok) {
				goto('/processes/east-loadout/review?sampleId=' + sampleId);
			}
		} catch (err) {
			error = 'Failed to submit wagon';
		}
	}

	function handleCancel() {
		goto('/processes');
	}

	function handleCapture(event: CustomEvent<string>) {
		rfidTag = event.detail;
	}
</script>

<div class="container">
	<h1>East Loadout - Wagon Details</h1>
	<p class="sample-id">Sample ID: {sampleId}</p>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	<div class="form">
		<div class="input-group">
			<label for="wagonId">Wagon ID / RFID Tag</label>
			<input id="wagonId" type="text" bind:value={wagonId} placeholder="Enter Wagon ID" />
			<input type="text" bind:value={rfidTag} placeholder="Scan RFID tag" />
			<button class="camera-button" on:click={() => (showCamera = true)}> Scan RFID </button>
		</div>

		<div class="input-group">
			<label>Sampling Status</label>
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

		<Camera {showCamera} on:capture={handleCapture} on:close={() => (showCamera = false)} />

		<div class="button-group">
			<button class="cancel-button" on:click={handleCancel}>Cancel</button>
			<button class="submit-button" on:click={handleSubmit}>Submit Wagon</button>
		</div>
	</div>
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

	input {
		width: 100%;
		padding: 0.75rem;
		font-size: 1.1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		margin-bottom: 0.5rem;
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

	.camera-button {
		background-color: #2196f3;
	}

	.error {
		background-color: #ffebee;
		color: #c62828;
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}
</style>
