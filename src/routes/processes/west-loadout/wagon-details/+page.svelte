<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import WagonDetails from '$lib/components/WagonDetails.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Wagon } from '$lib/types/wagon';

	const sampleId = $page.url.searchParams.get('sampleId') || '';
	let currentWagon = {
		id: '',
		rfidTag: '',
		weight: '',
		samplingStatus: 'No' as 'Yes' | 'No'
	};

	async function handleWagonSubmit(event: CustomEvent) {
		try {
			// Create wagon object according to Wagon interface
			const wagon: Wagon = {
				id: currentWagon.id || currentWagon.rfidTag,
				transcoreTag: currentWagon.rfidTag,
				wagonIdSimple: currentWagon.id,
				created: new Date().toISOString(),
				updated: new Date().toISOString(),
				weight: currentWagon.weight,
				samplingStatus: currentWagon.samplingStatus 
			};

			// Save wagon to IndexedDB
			await indexedDBService.saveRecord('wagons', wagon);

			// Update assay to link the wagon
			const assay = await indexedDBService.getAssayById(sampleId);
			if (assay) {
				const updatedAssay = {
					...assay,
					linkedWagonIds: [...(assay.linkedWagonIds || []), wagon.id],
					updated: new Date().toISOString()
				};
				await indexedDBService.saveRecord('assays', updatedAssay);
			}

			// Try to sync with backend if online
			try {
				await fetch('/api/wire/wagons', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						...wagon,
						sampleId
					})
				});
			} catch (err) {
				console.warn('Failed to sync with backend, but data saved locally');
			}

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
