<script lang="ts">
	import { goto } from '$app/navigation';
	import Camera from '$lib/components/Camera.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { TruckLoad } from '$lib/types/truckLoad';
	import type { Assay } from '$lib/types/assay';
	import { onMount } from 'svelte';
  
	let truckId = '';
	let materialType = 'LG';
	let loadedWeight = '';
	let sampleId = '';
	let showCamera = true;
	let capturedImage = '';
	let error = '';
  
	const materialTypes = ['HG', 'LG', 'Reverts'];
	let availableTrucks: { id: string; registration: string; serverId: string }[] = [];
  
	const steps = ['Truck Details', 'Complete'];
	let currentStep = 1;
  
	onMount(async () => {
	  const trucks = await indexedDBService.getRecords('trucks');
	  availableTrucks = trucks;
	});
  
	async function handleSubmit() {
	  try {
		const truckLoadId = crypto.randomUUID();
		const truckLoad: TruckLoad = {
		  id: truckLoadId,
		  truckId,
		  felWeight: loadedWeight,
		  created: new Date(),
		  samplingStatus: true,
		  syncStatus: 'pending',
		  process: 'Copper Truck Loadout',
		  sampleId,
		  siteLocation: 'PMC',
		};
  
		const assay: Assay = {
		  id: crypto.randomUUID(),
		  name: sampleId,
		  created: new Date(),
		  dedicatedFleet: false,
		  commodity: 'Copper',
		  productType: materialType,
		  linkedTruckLoadIds: [truckLoadId],
		  syncStatus: 'pending',
		  process: 'Copper Truck Loadout',
		  sampleId,
		  siteLocation: 'PMC',
		};
  
		await Promise.all([
		  indexedDBService.saveRecord('truckLoads', truckLoad),
		  indexedDBService.saveRecord('assays', assay)
		]);
  
		goto(`/pmc/processes/concentrator-&-smelter/copper-concentrate/lg-concentrate/verification?truckLoadId=${truckLoadId}&assayId=${assay.id}`);
	} catch (err) {
		console.error('Failed to save records:', err);
		error = 'Failed to save data';
	  }
	}
  
	function handleCancel() {
	  goto('/pmc/processes/concentrator-&-smelter/copper-concentrate');
	}
  
	function handleCapture(event: CustomEvent<string>) {
	  capturedImage = event.detail;
	  showCamera = false;
	}
  </script>
  
  <ProcessLayout
	title="LG Copper Concentrate"
	{steps}
	{currentStep}
	isSubmitting={false}
	cancelPath="/pmc/processes/concentrator-&-smelter/copper-concentrate"
	on:cancel={handleCancel}
	on:submit={handleSubmit}
  >
	<div slot="header">
	  <h5 class="text-gray text-xl font-bold">Sample Data Capturing</h5>
	</div>
  
	{#if error}
	  <div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
		{error}
	  </div>
	{/if}
  
	<FormField
	  id="truckRegistration"
	  label="Truck Registration"
	  isSelect={true}
	  options={availableTrucks.map(truck => ({ value: truck.serverId, label: truck.registration }))}
	  bind:value={truckId}
	  placeholder="Select Truck Registration"
	  required
	/>

	{#if showCamera}
		<Camera 
			onPhotoSelected={(file) => {
				/*Handle the file*/
			}} 
			on:capture={handleCapture} 
			on:close={() => (showCamera = false)} />
	{/if}
	<FormField
	  id="materialType"
	  label="Material Type"
	  isSelect={true}
	  options={materialTypes.map(type => ({ value: type, label: type }))}
	  bind:value={materialType}
	  placeholder="Select Material Type"
	  required
	/>
  
	<FormField
	  id="loadedWeight"
	  label="Loaded Weight (kg)"
	  type="number"
	  bind:value={loadedWeight}
	  placeholder="Enter loaded weight"
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
  </ProcessLayout>
  