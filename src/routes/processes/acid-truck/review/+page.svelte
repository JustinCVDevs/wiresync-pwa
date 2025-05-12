<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay } from '$lib/types/assay';
	import type { TruckLoad } from '$lib/types/truckLoad';

	// Update the variable declaration
	let assay: Assay | null | undefined = null;
	let truckLoad: TruckLoad | null | undefined = null;
	let truck: any | null | undefined = null;

	onMount(async () => {
		try {
			const assayId = $page.url.searchParams.get('assayId');
			if (!assayId) {
				return;
			}

			// Fetch assay
			assay = await indexedDBService.getRecord('assays', assayId);
			if (!assay) {
				return;
			}

			// Fetch linked truck load
			if (assay.linkedTruckLoadIds?.[0]) {
				truckLoad = await indexedDBService.getRecord('truckLoads', assay.linkedTruckLoadIds[0]);

				// Fetch truck details
				if (truckLoad?.truckId) {
					truck = await indexedDBService.getRecord('trucks', truckLoad.truckId);
				}
			}
		} catch (err) {
			console.error('Failed to fetch data:', err);
		}
	});

	function handleConfirm() {
		goto('/processes');
	}
</script>

<div class="container">
	<h1>Review Acid Truck Details</h1>

	{#if assay && truckLoad}
		<div class="review-section">
			<h2>Sample Details</h2>
			<div class="detail-item">
				<span class="label">Sample ID:</span>
				<span>{assay.name}</span>
			</div>
			<div class="detail-item">
				<span class="label">Process:</span>
				<span>{assay.process}</span>
			</div>
			<div class="detail-item">
				<span class="label">Product Type:</span>
				<span>{assay.productType}</span>
			</div>

			<h2>Truck Details</h2>
			<div class="detail-item">
				<span class="label">Truck Registration:</span>
				<span>{truck?.registration || 'N/A'}</span>
			</div>
			<div class="detail-item">
				<span class="label">Tank Location:</span>
				<span>{truckLoad.loadingLocation}</span>
			</div>
			<div class="detail-item">
				<span class="label">Acid Type:</span>
				<span>{truckLoad.acidType}</span>
			</div>
		</div>

		<div class="button-group">
			<button class="confirm-button" on:click={handleConfirm}>Confirm</button>
		</div>
	{:else}
		<div class="loading">Loading...</div>
	{/if}
</div>

<style>
	.container {
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem;
	}

	.review-section {
		background-color: #f5f5f5;
		padding: 1.5rem;
		border-radius: 8px;
		margin: 1rem 0;
	}

	.detail-item {
		margin: 1rem 0;
		display: flex;
		justify-content: space-between;
		border-bottom: 1px solid #ddd;
		padding-bottom: 0.5rem;
	}

	.label {
		font-weight: bold;
		color: #666;
	}

	.image-section {
		margin-top: 2rem;
	}

	.image-section img {
		width: 100%;
		border-radius: 4px;
		margin-top: 1rem;
	}

	.button-group {
		margin-top: 2rem;
		display: flex;
		justify-content: center;
	}

	.confirm-button {
		background-color: #4caf50;
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
	}

	.error {
		background-color: #ffebee;
		color: #c62828;
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.loading {
		text-align: center;
		padding: 2rem;
		color: #666;
	}
</style>
