<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	// Add TruckLoad type import at the top
	import type { Assay, Truck } from '$lib/types';
	import type { TruckLoad } from '$lib/types/truckLoad';
	import TruckRegistration from '$lib/components/TruckRegistration.svelte';
	import FormField from '$lib/components/FormField.svelte';

	const assayId = $page.url.searchParams.get('assayId') || '';
	let assay: Assay | undefined;
	let selectedTruck = '';
	let felWeight = '';
	let samplingStatus: 'Yes' | 'No' = 'No';
	let loadingLocation = 'Gavelotte';
	let loadingHour = '';
	let availableTrucks: Truck[] = [];
	let error = '';
	let isLoading = true;

	async function loadData() {
		try {
			// Load assay data
			const assayData = await indexedDBService.getRecord('assays', assayId);
			if (!assayData) {
				error = 'Assay not found';
				return;
			}
			assay = assayData;

			// Load available trucks
			const trucks = await indexedDBService.getAllRecords('trucks');
			availableTrucks = trucks;
		} catch (err) {
			error = 'Failed to load data';
			console.error(err);
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		if (assayId) {
			loadData();
		}
	});

	const loadingLocations = ['West Load Out', 'East Load Out', 'Gravelotte'];

	// Add validation function at the top of the script
	function validateLoadingHour(value: string) {
		const hour = parseInt(value);
		return !isNaN(hour) && hour >= 0 && hour <= 23;
	}

	async function handleSubmit() {
		try {
			if (!assay) return;
			if (!validateLoadingHour(loadingHour)) {
				error = 'Loading hour must be between 00 and 23';
				return;
			}

			const truckLoad: TruckLoad = {
				id: crypto.randomUUID(),
				truckId: selectedTruck,
				felWeight: felWeight,
				samplingStatus: samplingStatus === 'Yes',
				loadingLocation,
				loadingHour,
				process: 'Gravelotte',
				syncStatus: 'pending',
				created: new Date(),
				updated: new Date().toISOString(),
				siteLocation: 'PMC',
			};

			// Save truckLoad to IndexedDB
			await indexedDBService.saveRecord('truckLoads', truckLoad);

			// Update assay with new truckLoad ID
			const updatedAssay: Assay = {
				...assay,
				syncStatus: 'pending',
				linkedTruckLoadIds: [...(assay.linkedTruckLoadIds || []), truckLoad.id].filter(
					(id): id is string => id !== undefined
				),
				updated: new Date().toISOString()
			};
			await indexedDBService.saveRecord('assays', updatedAssay);

			goto(`/pmc/processes/magnetite-road/gravelotte/add-trucks?assayId=${assay.id}`);
		} catch (err) {
			error = 'Failed to submit truck data';
			console.error(err);
		}
	}

	function handleCancel() {
		history.back();
	}
	const steps = [
		"Sample Details",
		"Wagon Linkage", 
		"Complete"
	]
let currentStep = 2
</script>

<div class="bg-white rounded shadow p-4 text-gray">

	{#if assay}
		<p class="mb-4 text-sm font-medium text-gay">Adding new truck to Gravelotte 
			<br>Sample ID: {assay.name}</p>
	{/if}

	{#if isLoading}
		<div class="flex justify-center py-4">Loading...</div>
	{:else}
		<div class="space-y-6">
			<TruckRegistration
	availableTrucks={availableTrucks}
	bind:selectedValue={selectedTruck}
/>

			<div class="form-field">
				<FormField 
					id="felWeight"
					label="FEL Weight (kg)"
					type="number"
					bind:value={felWeight}
					placeholder="Enter FEL Weight"
					required
				/>
			</div>

			<div class="form-field">
				<span class="form-label">Sample Status</span>
				<div class="flex gap-4">
					<label class="inline-flex items-center radio-equal">
						<input type="radio" class="form-radio" name="samplingStatus" value="Yes" bind:group={samplingStatus} />
						<span class="ml-2">Yes</span>
					</label>
					<label class="inline-flex items-center radio-equal">
						<input type="radio" class="form-radio" name="samplingStatus" value="No" bind:group={samplingStatus} />
						<span class="ml-2">No</span>
					</label>
				</div>
			</div>

			<div class="form-field">
				<label for="loadingLocation" class="form-label">Loading Location</label>
				<select id="loadingLocation" class="form-select" bind:value={loadingLocation} required>
					<option value="">Select Loading Location</option>
					{#each loadingLocations as location}
						<option value={location}>{location}</option>
					{/each}
				</select>
			</div>

			<div class="form-field">
				<label for="loadingHour" class="form-label">Loading Hour (00-23)</label>
				<input
					id="loadingHour"
					type="text"
					class="form-input"
					bind:value={loadingHour}
					maxlength="2"
					pattern="[0-9]*"
					placeholder="Enter hour (00-23)"
					required
				/>
			</div>
		</div>
	{/if}
	<div class="button-group">
		<button class="cancel-button" on:click={handleCancel}>Cancel</button>
		<button class="new-button" on:click={handleSubmit}>Add Truck</button>
	</div>
</div>

<style>
	.form-field {
		margin-bottom: 2rem;
		width: 350px;
		max-width: 100%;
	}
	.radio-equal {
        flex: 1 1 0;
        justify-content: center;
        display: flex;
        align-items: center;
    }
	.space-y-6 {
    display: flex;
    flex-direction: column;
    align-items: center;
}
</style>
