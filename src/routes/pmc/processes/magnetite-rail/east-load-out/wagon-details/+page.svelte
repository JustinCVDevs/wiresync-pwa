<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import WagonDetails from '$lib/components/WagonDetails.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Wagon } from '$lib/types/wagon';
	import type { Assay } from '$lib/types/assay';
	import { syncService } from '$lib/services/syncService';

	const sampleId = $page.url.searchParams.get('sampleId') || '';
	let currentWagon = {
		id: '',
		rfidTag: '',
		weight: '',
		samplingStatus: 'No' as 'Yes' | 'No'
	};

	async function handleWagonSubmit(event: CustomEvent) {
		try {
			const wagon: Wagon = {
				id: currentWagon.id || currentWagon.rfidTag,
				transcoreTag: currentWagon.rfidTag,
				wagonIdSimple: currentWagon.id,
				created: new Date(),
				updated: new Date().toISOString(),
				weight: currentWagon.weight,
				samplingStatus: currentWagon.samplingStatus,
				syncStatus: 'pending'
			};

			// Save wagon to IndexedDB
			await indexedDBService.saveRecord('wagons', wagon);
			await syncService.syncWagon(wagon);

			// Update assay to link the wagon
			const assay = await indexedDBService.getAssayById(sampleId);
			if (assay) {
				const updatedAssay: Assay = {
					...assay,
					linkedWagonIds: [...(assay.linkedWagonIds || []), wagon.id].filter(
						(id): id is string => id !== undefined
					),
					updated: new Date().toISOString(),
					syncStatus: 'pending'
				};
				await indexedDBService.saveRecord('assays', updatedAssay);
				await syncService.syncAssay(updatedAssay);
			}

			goto('/pmc/processes/magnetite-rail/east-load-out/review?sampleId=' + sampleId);
		} catch (err) {
			console.error('Failed to submit wagon:', err);
		}
	}

	function handleCancel() {
		goto('/pmc/processes/magnetite-rail');
	}
</script>

<div class="container">
	<h1>East Loadout - Wagon Details</h1>
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
