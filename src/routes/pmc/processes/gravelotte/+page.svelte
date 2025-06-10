<script lang="ts">
	import YesNo from '$lib/components/YesNo.svelte';
  
	  import { goto } from '$app/navigation';
	  import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	  import { indexedDBService } from '$lib/services/indexedDBService';
	  import type { Assay } from '$lib/types';
	  import FormField from '$lib/components/FormField.svelte';
  
	  $: isDedicatedFleet = '';
	  let sampleId = '';
	  let sampleSize = '';
	  let commodity = '';
	  let productType = '';
	  let error = '';
  // TODO:
  // The dedicatedFleet switch merely dictates what the resulting component type will be.
  // If dedicatedFleet is true, the resulting component type will be Fleet.
  // If dedicatedFleet is false, the resulting component type will be Truck.		
	  const sampleSizes = ['1', '5', '10'];
	  const commodities = ['Magnetite', 'Mag-64%', 'Mag-65%', 'Iron Oxide'];
	  const productTypes = ['Coarse', 'DMS'];
	  const steps = [
		  "Sample Details",
		  "Truck Details",
		  "Complete"
	  ]
	  async function handleSubmit() {
		  try {
			  if (isDedicatedFleet == 'Yes'){
  // create fleet 
			  }else{
  // ccreate
			  }
			  
			  const assay: Assay = {
				  id: crypto.randomUUID(),
				  name: sampleId,
				  sampleSize,
				  commodity,
				  productType,
				  dedicatedFleet: isDedicatedFleet === 'Yes', // Convert to boolean
				  syncStatus: 'pending',
				  created: new Date(),
				  updated: new Date().toISOString(),
				  process: 'Gravelotte',
			  };
  
			  // Save assay to IndexedDB
			  await indexedDBService.saveRecord('assays', assay);
  
			  goto(`/pmc/processes/gravelotte/add-trucks?assayId=${assay.id}`);
		  } catch (err) {
			  error = 'Failed to submit data';
			  console.error(err);
		  }
	  }
	  let currentStep = 1;
	  function handleCancel() {
		  goto('/pmc/processes');
	  }
  </script>
  <ProcessLayout
  title="Gravelotte"
  {steps}
  {currentStep}
  isSubmitting={false}
  cancelPath="/processes"
  on:cancel={() => goto('/pmc/processes')}
  on:submit={handleSubmit}
  on:error={({ detail }) => (error = detail)}
  >
  <slot name="header" />
  
	  {#if error}
		  <div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			  {error}
		  </div>
	  {/if}
  
		  <h2 class="">Truck Data Capturing</h2>
  
						  
			  
			  <YesNo selected={isDedicatedFleet} label={"Dedicated Fleet"} description={"Please specify wether the truck is part of a fleet."}/>
				  
			  
  
			  
				  <FormField
					  id="sampleId"
					  label="Sample ID"
					  type="text"
					  bind:value={sampleId}
					  placeholder="Enter Sample ID"
					  required
  
				  />
				  <FormField
					  id="sampleSize"
					  label="Sample Size"
					  isSelect={true}
					  options={sampleSizes.map(size => ({ value: size, label: size }))}
					  bind:value={sampleSize}
					  placeholder="Enter Sample Size"
					  required
  
				  />
				  <FormField
					  id="commodity"
					  label="Commodity"
					  isSelect={true}
					  options={commodities.map(item => ({ value: item, label: item }))}
					  bind:value={commodity}
					  placeholder="Enter Commodity"
					  required
  
				  />
				  <FormField
					  id="productType"
					  label="Product Type"
					  isSelect={true}
					  options={productTypes.map(type => ({ value: type, label: type }))}
					  bind:value={productType}
					  placeholder="Enter Product Type"
					  required
				  
				  />
		  
  </ProcessLayout>