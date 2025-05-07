<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const sampleId = $page.url.searchParams.get('sampleId') || '';
	let wagons: Array<{
		wagonId: string;
		rfidTag: string;
		samplingStatus: 'Yes' | 'No';
	}> = [];
	let error = '';

	onMount(async () => {
		try {
			const response = await fetch(`/api/wire/wagons?sampleId=${sampleId}`);
			wagons = await response.json();
		} catch (err) {
			error = 'Failed to load wagon details';
		}
	});

	function handleNewWagon() {
		goto(`/processes/east-loadout/wagon-details?sampleId=${sampleId}`);
	}

	async function handleCompleteLoading() {
		try {
			await fetch('/api/wire/loading/complete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sampleId })
			});
			goto('/processes/east-loadout');
		} catch (err) {
			error = 'Failed to complete loading';
		}
	}

	function handleCancel() {
		goto('/processes');
	}
</script>

<div class="container">
	<h1>East Loadout - Review</h1>
	<p class="sample-id">Sample ID: {sampleId}</p>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	<div class="wagons-list">
		<h2>Linked Wagons</h2>
		{#if wagons.length > 0}
			<table>
				<thead>
					<tr>
						<th>Wagon ID</th>
						<th>RFID Tag</th>
						<th>Sampling Status</th>
					</tr>
				</thead>
				<tbody>
					{#each wagons as wagon}
						<tr>
							<td>{wagon.wagonId}</td>
							<td>{wagon.rfidTag}</td>
							<td>{wagon.samplingStatus}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p>No wagons linked yet.</p>
		{/if}
	</div>

	<div class="button-group">
		<button class="cancel-button" on:click={handleCancel}> Cancel </button>
		<button class="new-button" on:click={handleNewWagon}> + NEW Wagon </button>
		{#if wagons.length > 0}
			<button class="complete-button" on:click={handleCompleteLoading}> Complete Loading </button>
		{/if}
	</div>
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	.sample-id {
		font-size: 1.2rem;
		margin-bottom: 2rem;
		font-weight: bold;
	}

	.wagons-list {
		margin: 2rem 0;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 1rem;
	}

	th,
	td {
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid #ddd;
	}

	th {
		background-color: #f5f5f5;
		font-weight: bold;
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

	.new-button {
		background-color: #2196f3;
	}

	.complete-button {
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
