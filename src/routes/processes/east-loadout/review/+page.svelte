<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import TransactionDetails from '$lib/components/TransactionDetails.svelte';
	import type { Assay } from '$lib/types/assay';
	import type { Wagon } from '$lib/types/wagon';

	const sampleId = $page.url.searchParams.get('sampleId') || '';
	let assay: Assay | null = null;
	let wagons: Wagon[] = [];

	async function loadData() {
		const fetchedAssay = await indexedDBService.getAssayById(sampleId);
		if (!fetchedAssay) {
			assay = null;
			return;
		}

		assay = fetchedAssay;
		if (assay.linkedWagonIds?.length) {
			const fetchedWagons = await Promise.all(
				assay.linkedWagonIds.map(async (id) => {
					const wagon = await indexedDBService.getRecord('wagons', id);
					return wagon || null;
				})
			);
			wagons = fetchedWagons.filter((wagon): wagon is Wagon => wagon !== null);
		}
	}

	function handleAddWagon() {
		goto(`/processes/east-loadout/wagon-details?sampleId=${sampleId}`);
	}

	function handleComplete() {
		goto('/processes/east-loadout');
	}

	function handleCancel() {
		goto('/processes');
	}

	// Load data when component mounts
	loadData();
</script>

<div class="container">
	<h1>East Loadout - Review</h1>

	{#if assay}
		<TransactionDetails {assay} {wagons}>
			<div class="button-group">
				<button class="add-button" on:click={handleAddWagon}>+ New Wagon</button>
				<button class="complete-button" on:click={handleComplete}>Complete Loading</button>
				<button class="cancel-button" on:click={handleCancel}>Cancel</button>
			</div>
		</TransactionDetails>
	{:else}
		<p>Loading...</p>
	{/if}
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
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

	.add-button {
		background-color: #2196f3;
	}

	.complete-button {
		background-color: #4caf50;
	}

	.cancel-button {
		background-color: #f44336;
	}
</style>
