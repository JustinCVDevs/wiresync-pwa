<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import WagonInput from '$lib/components/WagonInput.svelte';

	interface TrainDetails {
		trainRef: string;
		consignment: string;
		trainRfid: string;
	}

	let trainDetails: TrainDetails = {
		trainRef: $page.url.searchParams.get('trainRef') || '',
		consignment: $page.url.searchParams.get('consignment') || '',
		trainRfid: $page.url.searchParams.get('trainRfid') || ''
	};

	let linkedWagons: Array<{ wagonId: string; rfidTag: string; image: string | null }> = [];

	async function handleWagonSubmit(
		event: CustomEvent<{ wagonId: string; rfidTag: string; image: string | null }>
	) {
		const timestamp = new Date().toISOString();

		try {
			// Link wagon to train and consignment
			await fetch('/api/wire/wagons/link', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					wagonId: event.detail.wagonId,
					rfidTag: event.detail.rfidTag,
					trainRef: trainDetails.trainRef,
					consignment: trainDetails.consignment,
					timestamp: timestamp,
					image: event.detail.image
				})
			});

			linkedWagons = [...linkedWagons, event.detail];
			goto('?mode=success');
		} catch (err) {
			console.error('Failed to link wagon:', err);
		}
	}

	async function handleCompleteLoading() {
		const date = new Date();
		const formattedDate = `${date.getDate().toString().padStart(2, '0')}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getFullYear().toString().slice(-2)}`;

		try {
			// Link train to consignment
			await fetch('/api/wire/trains/link', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					trainName: `${formattedDate}_${trainDetails.trainRfid}`,
					consignment: trainDetails.consignment
				})
			});

			goto('/processes');
		} catch (err) {
			console.error('Failed to complete loading:', err);
		}
	}

	function handleCancel() {
		goto('/processes');
	}
</script>

<div class="wagon-linkage">
	<h1>Wagon Linkage</h1>

	<div class="train-details">
		<h2>Train Details</h2>
		<p>Train Reference: {trainDetails.trainRef}</p>
		<p>Consignment: {trainDetails.consignment}</p>
		<p>Train RFID: {trainDetails.trainRfid}</p>
	</div>

	{#if linkedWagons.length > 0}
		<div class="linked-wagons">
			<h2>Linked Wagons</h2>
			<ul>
				{#each linkedWagons as wagon}
					<li>Wagon ID: {wagon.wagonId} - RFID: {wagon.rfidTag}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<WagonInput on:submit={handleWagonSubmit} on:cancel={handleCancel} />

	{#if linkedWagons.length > 0}
		<div class="complete-section">
			<button class="new-wagon-button" on:click={() => goto('?mode=new')}> + NEW Wagon </button>
			<button class="complete-button" on:click={handleCompleteLoading}> Complete Loading </button>
		</div>
	{/if}
</div>

<style>
	.wagon-linkage {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	.train-details {
		background: #f5f5f5;
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 2rem;
	}

	.linked-wagons {
		margin: 2rem 0;
	}

	.complete-section {
		display: flex;
		gap: 1rem;
		margin-top: 2rem;
	}

	.new-wagon-button {
		background-color: #2196f3;
		color: white;
		border: none;
		border-radius: 4px;
		padding: 0.75rem 1.5rem;
		cursor: pointer;
	}

	.complete-button {
		background-color: #4caf50;
		color: white;
		border: none;
		border-radius: 4px;
		padding: 0.75rem 1.5rem;
		cursor: pointer;
	}
</style>
