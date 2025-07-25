<script lang="ts">
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay, Truck } from '$lib/types';
	import FormField from '$lib/components/FormField.svelte';
	import { syncService } from '$lib/services/syncService';
	import { onMount } from 'svelte';

	let truckRegistration = '';
	let materialType = 'HG';
	let sampleId = '';
	let loadingLocation = 'HG Concentrate';
	let error = '';
	let processLayout: ProcessLayout;
	let trucks: Truck[] = [];
	let showDropdown = false;

	const steps = ["Sample Details", "Complete"]

	$: {
		const currentDate = new Date();
		const YYMMDD = `${currentDate.getFullYear().toString().slice(-2)}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;

		const productCode = {
			'HG': 'HG',
			'LG': 'LG',
			'Reverts': 'REV'
		}[materialType];

		sampleId = `${YYMMDD}${truckRegistration ? `_${truckRegistration}` : ''}${productCode ? `_${productCode}` : ''}`;
	}

	$: if (showDropdown) {
		const searchInput = document.querySelector('#truckRegistartion-search') as HTMLInputElement;
		console.log('Search input:', searchInput);
		if (searchInput) {
			searchInput.focus(); 
		}
	}

	// Fetch truck records from IndexedDB on component mount
    onMount(async () => {
        try {
            trucks = await indexedDBService.getAllRecords('trucks');
            // Sort trucks alphabetically by registration
            trucks.sort((a, b) => a.registration.localeCompare(b.registration));
        } catch (err) {
            console.error('Failed to load trucks from IndexedDB:', err);
            error = 'Failed to load truck records';
        }
    });

	async function handleSubmit() {
		try {
			processLayout.setError('');
			processLayout.setSuccess('');

			const truck: Truck = {
				id: crypto.randomUUID(),
				registration: truckRegistration,
				syncStatus: 'pending',
				created: new Date(),
				loadingLocation: loadingLocation,
			};

			await indexedDBService.saveRecord('trucks', truck);
			await syncService.syncTruck(truck);

			let newTruck = (await indexedDBService.getAllRecords('trucks')).filter(
				(truck: Truck) => truck.registration === truckRegistration
			)[0];

			const assay: Assay = {
				id: crypto.randomUUID(),
				name: sampleId,
				materialType: materialType,
				linkedTruckIds: [newTruck?.serverId || newTruck?.id],
				syncStatus: 'pending',
				location: loadingLocation,
				created: new Date(),
				updated: new Date().toISOString(),
				process: 'Concentrator & Smelter',
				sampleId: sampleId,
				siteLocation: 'PMC',
			};

			await indexedDBService.saveRecord('assays', assay);
			await syncService.syncAssay(assay);

			goto(`/pmc/processes/concentrator-&-smelter/copper-concentrate/hg-concentrate/sampling/verification?sampleId=${encodeURIComponent(sampleId)}&truckRegistration=${encodeURIComponent(truckRegistration)}`)
		} catch (err) {
			error = 'Failed to submit data';
			console.error(err);
		}
	}
	let currentStep = 1;
	function handleCancel() {
		goto('/pmc/processes/concentrator-&-smelter');
	}
</script>
<ProcessLayout
  title="Copper Concentrate"
  {steps}
  {currentStep}
  isSubmitting={false}
  bind:this={processLayout}
  cancelPath="/pmc/processes/concentrator-&-smelter"
  on:cancel={handleCancel}
  on:submit={handleSubmit}
  on:error={({ detail }) => (error = detail)}
>
	<slot name="header" />
	
	{#if error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{error}
		</div>
	{/if}

	<h2 class='header'>Truck Details Capturing</h2>
	<span class='note' style="margin-top: -0.2rem; display: block; font-size: 12px;">Please note that every truck has to be sampled</span>

	<div>
		<div class='form-field'>
			<FormField
				id="truckRegistration"
				label="Select the Truck Registration"
				search={true}
				options={trucks.map((truck) => ({ value: truck.registration, label: truck.registration }))} 
				bind:value={truckRegistration}
				placeholder="Select Truck Registration"
				required
			/>
		</div>
		<div class='form-field'>
			<FormField
				id="materialType"
				label="Material Type"
				isSelect={true}
				options={[
					{ value: 'HG', label: 'HG' },
					{ value: 'LG', label: 'LG' },
					{ value: 'Reverts', label: 'Reverts' }
				]}
				bind:value={materialType}
				placeholder="Enter Material Type"
				required
			/>
		</div>
		<div class='form-field'>
			<FormField
				id="sampleId"
				label="Sample ID"
				type="text"
				bind:value={sampleId}
				placeholder="Enter Sample ID"
				required
			/>
		</div>
	</div>
</ProcessLayout>

<style>
	.form-field {
		width: 100%;
		margin-bottom: 1.5rem;
	}
	
	.header {
		font-size: 1.3rem;
		font-weight: bold;
		margin-bottom: 0.5rem;
		color: #333;
	}
</style>