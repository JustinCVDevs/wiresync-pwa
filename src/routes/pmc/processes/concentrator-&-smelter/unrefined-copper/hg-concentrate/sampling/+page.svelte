<script lang="ts">
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay, Truck, TruckLoad } from '$lib/types';
	import FormField from '$lib/components/FormField.svelte';
	import { syncService } from '$lib/services/syncService';
	import { onMount } from 'svelte';
	import QRPrinting from '$lib/components/QRPrinting.svelte';

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

			let linkTruck = (await indexedDBService.getAllRecords('trucks')).filter(
				(truck: Truck) => truck.registration === truckRegistration
			)[0];

			const truckLoad: TruckLoad = {
				id: crypto.randomUUID(),
				truckId: linkTruck?.serverId || '',
				materialType: materialType,
				sampleId: sampleId,
				loadingLocation: loadingLocation,
				created: new Date(),
				updated: new Date().toISOString(),
				siteLocation: 'PMC',
				syncStatus: 'pending',
			}

			await indexedDBService.saveRecord('truckLoads', truckLoad);
			await syncService.syncTruckLoad(truckLoad);

			let newTruckLoad = (await indexedDBService.getAllRecords('truckLoads')).filter(
				(truckLoad: TruckLoad) => truckLoad.sampleId === sampleId
			)[0];

			const assay: Assay = {
				id: crypto.randomUUID(),
				name: sampleId,
				materialType: materialType,
				linkedTruckLoadIds: [newTruckLoad?.serverId || ''],
				syncStatus: 'pending',
				location: loadingLocation,
				created: new Date(),
				updated: new Date().toISOString(),
				sampleId: sampleId,
				siteLocation: 'PMC',
			};

			await indexedDBService.saveRecord('assays', assay);
			await syncService.syncAssay(assay);

			goto(`/pmc/processes/concentrator-&-smelter/unrefined-copper/hg-concentrate/sampling/verification?sampleId=${encodeURIComponent(sampleId)}&truckRegistration=${encodeURIComponent(truckRegistration)}`)
		} catch (err) {
			error = 'Failed to submit data';
			console.error(err);
		}
	}
	let currentStep = 1;
	function handleCancel() {
		goto('/pmc/processes/concentrator-&-smelter/unrefined-copper/hg-concentrate');
	}
</script>
<ProcessLayout
  title="Copper Concentrate"
  {steps}
  {currentStep}
  isSubmitting={false}
  bind:this={processLayout}
  cancelPath="/pmc/processes/concentrator-&-smelter/unrefined-copper/hg-concentrate"
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

	<FormField
		id="sampleId"
		label="Sample ID"
		type="text"
		bind:value={sampleId}
		placeholder="Enter Sample ID"
		required
	/>

	<QRPrinting {sampleId} />
</ProcessLayout>

<style>
	.form-field {
		margin-top: 1rem;
		position: relative;
	}
	
	.header {
		font-size: 1.3rem;
		font-weight: bold;
		margin-bottom: 0.5rem;
		color: #333;
	}
</style>