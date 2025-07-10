<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay, Truck } from '$lib/types';
	import type { TruckLoad } from '$lib/types/truckLoad';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import TruckRegistration from '$lib/components/TruckRegistration.svelte';
	import { CheckCircle, TruckIcon } from 'lucide-svelte';

	let assayId = $page.url.searchParams.get('assayId') || '';
	let assay: Assay | undefined;
	let linkedTrucks: any[] = [];
	let error = '';
	let isLoading = true;
	let truckLoads: TruckLoad[] = [];
	let trucks: Truck[] = [];
	let addTruck = false;
	async function loadAssayData() {
		try {
			const assayData = await indexedDBService.getRecord('assays', assayId);
			if (!assayData) {
				error = 'Assay not found';
				return;
			}
			assay = assayData;

			// Load truck loads if assay has linked loads
			if (assay.linkedTruckLoadIds?.length) {
				const loads = await Promise.all(
					assay.linkedTruckLoadIds.map((id) => indexedDBService.getRecord('truckLoads', id))
				);
				truckLoads = loads.filter((load): load is TruckLoad => load !== undefined);
				if (truckLoads.length > 0) {
					currentStep = 3;
				}
			}

			trucks = await indexedDBService.getAllRecords('trucks');
		} catch (err) {
			error = 'Failed to load data';
			console.error(err);
		} finally {
			isLoading = false;
		}
	}
	function handleNewTruck() {
		if (!assay) return;
		currentStep = 2;
		addTruck = true;
	}
	function handleTruckCancel() {
		addTruck = false;
		currentStep = linkedTrucks.length > 0 ? 3 : 2;
	}
	function handleCancel() {
		goto('/pmc/processes/magnetite-road');
	}

	function formatDate(dateString: Date | undefined) {
		if (!dateString) return '';
		return new Date(dateString).toLocaleString();
	}

	$: if (assayId) {
		loadAssayData();
	}
	const steps = ['Sample Details', 'Truck Details', 'Complete'];
	let currentStep = 1;

	let selectedTruck: string;

	async function handleAddTruck(event: SubmitEvent) {
		event.preventDefault();
		try {
			if (!assay) return;
			if (!validateLoadingHour(loadingHour)) {
				error = 'Loading hour must be between 00 and 23';
				return;
			}
			currentStep = linkedTrucks.length > 0 ? 3 : 2;

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
				siteLocation: 'PMC'
			};

			// Save truckLoad to IndexedDB
			await indexedDBService.saveRecord('truckLoads', truckLoad);
			addTruck = false;
			currentStep = 2;
			samplingStatus= "";
			felWeight= '';
	 		loadingLocation=  'Gravelotte';
	 		loadingHour = '';
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

			loadAssayData();
			goto(`/pmc/processes/magnetite-road/truck-load-out/add-trucks?assayId=${assay.id}`);
		} catch (err) {
			error = 'Failed to submit truck data';
			console.error(err);
		}
	}
	let samplingStatus: string;
	let felWeight: string | undefined;
	$: message= '';
	let loadingLocation: any = 'Truck Load Out';
	let loadingHour: string;
	const loadingLocations = ['West Load Out', 'Truck Load Out', 'Gravelotte'];

	// Add validation function at the top of the script
	function validateLoadingHour(value: string) {
		const hour = parseInt(value);
		return !isNaN(hour) && hour >= 0 && hour <= 23;
	}


	function handleSubmit(e: CustomEvent<void>): void {
		message = 'Loading Completed Successfully';
		setTimeout(() => {
			goto('/pmc/processes');
		}, 2500);
	}
</script>
{#if message}
			<div class="bg-green-600 text-white border rounded-lg shadow-lg flex p-4" style="background: #91f1b5;color: #2f3c33;"><CheckCircle class="mr-4"/> {message}</div>
			{:else}
<ProcessLayout title="Truck Load Out" {currentStep} cancelPath="/pmc/processes/magnetite-road" on:cancel={handleCancel} on:submit={handleSubmit}>
	<div class="container">
		<h1 class="text-2xl font-black ease-in">Adding Trucks to a Lot</h1>

		{#if error}
			<div class="error">{error}</div>
		{/if}
		


		{#if isLoading}
			<div class="text-center">Loading...</div>
		{:else if assay}
			<div class="sampling-details">
				<h2 class="text-xl mb-4">Sampling Details</h2>
				<div class="details-grid rounded-lg border bg-gray-50  p-4 shadow-lg inset-boxshadow-sm">
					<div class="detail-item">
						<span class="label">Total Trucks Linked</span>
						<span class="value">{truckLoads.length}</span>
					</div>
					<div class="detail-item">
						<span class="label">Sample Batch Created</span>
						<span class="value">{formatDate(assay.created)}</span>
					</div>
					<div class="detail-item">
						<span class="label">Dedicated Fleet</span>
						<span class="value">{assay.dedicatedFleet ? 'Yes' : 'No'}</span>
					</div>
					<div class="detail-item">
						<span class="label">Sample ID</span>
						<span class="value">{assay.name}</span>
					</div>
					<div class="detail-item">
						<span class="label">Sample Size</span>
						<span class="value">{assay.sampleSize}</span>
					</div>
					<div class="detail-item">
						<span class="label">Commodity</span>
						<span class="value">{assay.commodity}</span>
					</div>
					<div class="detail-item">
						<span class="label">Product Type</span>
						<span class="value">{assay.productType}</span>
					</div>
				</div>
			</div>
			{#if truckLoads.length > 0}
				<div class="truck-loads my-4">
					<h2 class="font-bold">Linked Trucks ({truckLoads.length})</h2>
					<div class="loads-grid">
						{#each truckLoads as load}
							<div class="mb-6 rounded border text-xs p-4 bg-white">
								<div class="flex flex-col gap-2">
									<div class="flex justify-between  text-leftitems-center">
										<span class="font-semibold">📄 Trans Reference:</span>
										<span>{trucks?.find((t)=> t.id == load?.truckId)?.registration}</span>
									</div>
									<div class="flex justify-between items-center">
										<span class="font-semibold">⚖ FEL Weight:</span>
										<span>{load.felWeight} kg</span>
									</div>
									<div class="flex justify-between items-center">
										<span class="font-semibold">🔢 Sample Status:</span>
										<span>{load.samplingStatus ? 'Yes' : 'No'}</span>
									</div>
									<div class="flex justify-between items-center">
										<span class="font-semibold">🌍 Loading Location:</span>
										<span>{load.loadingLocation}</span>
									</div>
									<div class="flex justify-between items-center">
										<span class="font-semibold">🕒 Loading Hour:</span>
										<span>{load?.loadingHour}</span>
									</div>
									
									<div class="flex justify-between items-center">
										<span class="font-semibold">✏️ Created:</span>
										<span>{formatDate(load.created)}</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
			<div class="button-group mt-4 text-center">
				{#if !addTruck}
					<button class="new-button flex" on:click={handleNewTruck}
						>Add Truck &nbsp; <TruckIcon size="18" /></button
					>
				{/if}
			</div>
		{/if}
		<br />
		{#if addTruck}
		<form action="" on:submit|preventDefault={handleAddTruck}>
			<div class="add-truck-form rounded border border-1 p-4">
				<h5 class="text-center text-2xl font-bold">Enter Truck Details</h5>
				<div class="form-field">
					<TruckRegistration availableTrucks={trucks} bind:selectedValue={selectedTruck} />
				</div>
				<div class="form-field">
					<label for="felWeight" class="form-label block text-gray">FEL Weight (kg)</label>
					<input
						id="felWeight"
						type="number"
						class="form-input"
						bind:value={felWeight}
						placeholder="Enter FEL Weight"
						required
					/>
				</div>

				<span class="form-label">Sample Status</span>
				<div class="form-field flex gap-4">
					<label
						class="radio-equal flex items-center rounded border border-1 p-4 px-5 {samplingStatus == 'Yes' ? 'bg-gray text-white' : ''}"
					>
						<input
							type="radio"
							hidden
							name="samplingStatus"
							value="Yes"
							bind:group={samplingStatus}
						/>
						<span>Yes</span>
					</label>
					<label
						class="radio-equal flex items-center rounded border border-1 p-4 px-5 {samplingStatus == 'No' ? 'bg-gray text-white' : ''}"
					>
						<input
							type="radio"
							name="samplingStatus"
							value="No"
							hidden
							bind:group={samplingStatus}
						/>
						<span>No</span>
					</label>
				</div>

				<div class="form-field">
					<label for="loadingLocation" class="form-label block text-gray">Loading Location</label>
					<select
						id="loadingLocation"
						class="form-select"
						bind:value={loadingLocation}
						required
					>
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
				{#if error}
					<div class="error">{error}</div>
				{/if}
				<div class="button-group">
					<button class="cancel-button" on:click={handleTruckCancel}>Cancel</button>
					<span class="divider">\</span>
					<button type="submit" class="new-button">Submit Truck</button>
				</div>
			</div>
		</form>

		{/if}
	</div>
</ProcessLayout>
{/if}
<style>
	.detail-item {
		margin-bottom: 15px;
		display: flex;
		line-height: 1;
		font-size: 14px;
	}
	.detail-item .label {
		font-weight: bold;
		margin-right: 8px;
	}
	.detail-item span {
		flex: 1;
	}

	.add-truck-form {
		max-width: 400px;
		margin: 0 auto;
	}
	.form-field {
		width: 100%;
		margin-bottom: 1.5rem;
	}
	.form-input,
	.form-select {
		width: 100%;
		box-sizing: border-box;
		height: 50px;
	}
	.radio-equal {
		flex: 1 1 0;
		justify-content: center;
		min-width: 120px;
	}
	.button-group {
		display: flex;
		justify-content: center;
		gap: 2rem;
	}
	.divider {
		font-size: 1.7rem;
		line-height: 1;
		display: flex;
		align-items: center;
		user-select: none;
	}
</style>