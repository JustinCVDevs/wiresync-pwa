<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Camera from './Camera.svelte';

	export let wagonId = '';
	export let rfidTag = '';
	export let weight = '';
	export let samplingStatus: 'Yes' | 'No' = 'No';
	export let showCamera = false;

	const dispatch = createEventDispatcher<{
		submit: { wagonId: string; rfidTag: string; weight: string; samplingStatus: 'Yes' | 'No' };
		cancel: void;
	}>();

	function handleSubmit() {
		dispatch('submit', { wagonId, rfidTag, weight, samplingStatus });
	}

	function handleCancel() {
		dispatch('cancel');
	}
</script>

<div class="wagon-details">
	<div class="input-group">
		<label for="wagonId">Wagon ID / RFID Tag</label>
		<input
			id="wagonId"
			type="text"
			bind:value={wagonId}
			placeholder="Enter Wagon ID or scan RFID"
		/>
	</div>

	<div class="input-group">
		<label for="weight">Wagon Weight (kg)</label>
		<input id="weight" type="number" bind:value={weight} placeholder="Enter wagon weight" />
	</div>

	<div class="input-group">
		<label>Wagon Sampling Status</label>
		<div class="radio-group">
			<label>
				<input type="radio" name="samplingStatus" value="Yes" bind:group={samplingStatus} /> Yes
			</label>
			<label>
				<input type="radio" name="samplingStatus" value="No" bind:group={samplingStatus} /> No
			</label>
		</div>
	</div>

	<div class="button-group">
		<button class="cancel-button" on:click={handleCancel}>Cancel</button>
		<button class="submit-button" on:click={handleSubmit}>Submit Wagon</button>
	</div>
</div>

<style>
	.wagon-details {
		margin: 1rem 0;
	}

	.input-group {
		margin-bottom: 1rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: bold;
	}

	input[type='text'],
	input[type='number'] {
		width: 100%;
		padding: 0.75rem;
		font-size: 1.1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	.radio-group {
		display: flex;
		gap: 2rem;
	}

	.radio-group label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.button-group {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
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
</style>
