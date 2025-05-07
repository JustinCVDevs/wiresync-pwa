<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import WagonDetails from '$lib/components/WagonDetails.svelte';

	const sampleId = $page.url.searchParams.get('sampleId') || '';
	let currentWagon = {
		id: '',
		rfidTag: '',
		weight: '',
		samplingStatus: 'No' as 'Yes' | 'No'
	};

	async function handleWagonSubmit(event: CustomEvent) {
		try {
			await fetch('/api/wire/wagons', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...event.detail,
					sampleId
				})
			});

			goto('/processes/west-loadout/review?sampleId=' + sampleId);
		} catch (err) {
			console.error('Failed to submit wagon:', err);
		}
	}

	function handleCancel() {
		goto('/processes');
	}
</script>

<div class="container">
	<h1>West Loadout - Wagon Details</h1>
	<p>Sample ID: {sampleId}</p>

	<WagonDetails
		bind:wagonId={currentWagon.id}
		bind:rfidTag={currentWagon.rfidTag}
		bind:weight={currentWagon.weight}
		bind:samplingStatus={currentWagon.samplingStatus}
		on:submit={handleWagonSubmit}
		on:cancel={handleCancel}
	/>
</div>

<style>
	.container {
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem;
	}
</style>
