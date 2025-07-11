<script lang="ts">
	import YesNo from '$lib/components/YesNo.svelte';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay, Fleet, Truck } from '$lib/types';
	import FormField from '$lib/components/FormField.svelte';
	import TruckRegistration from '$lib/components/TruckRegistration.svelte';
	import { syncService } from '$lib/services/syncService';
  
	let dedicatedFleet = '';
	let isDedicatedFleet = false;

	let truckRegistration = '';
	let productType = '';
	let sampleId = '';
	let loadingLocation = 'Truck Load Out'; // <-- updated default value
	let loadingHour = '';
	let error = '';
	let processLayout: ProcessLayout;

	const steps = [
		"Sample Details",
		"Complete"
	]

	async function handleSubmit() {
		try {
			processLayout.setError('');
			processLayout.setSuccess('');

			//Check if truck is already registered
			let existingTruck = (await indexedDBService.getAllRecords('trucks')).filter(
				(truck: Truck) => truck.registration === truckRegistration
			)[0];

			if (existingTruck) {
				processLayout.setError('Truck already been registered');
				return;
			}

			if (dedicatedFleet === 'Yes') {
				isDedicatedFleet = true;

				const fleet: Fleet = {
					id: crypto.randomUUID(),
					sampleId,
					commodity: productType,
					materialType: 'Coarse',
					registration: sampleId,
					felMassKg: 0, // get from truck
					loadingLocation: loadingLocation, 
					loadingHour: Number(loadingHour), 
					syncStatus: 'pending',
					siteLocation: 'PMC',
					created: new Date(),
				};

				await indexedDBService.saveRecord('fleet', fleet);

				let newFleet = (await indexedDBService.getAllRecords('fleet')).filter(
					(fleet: Fleet) => fleet.registration === sampleId
				)[0];

				// Create truck object
				const truck: Truck = {
					id: crypto.randomUUID(),
					registration: truckRegistration,
					syncStatus: 'pending',
					created: new Date(),
					loadingLocation: loadingLocation,
					loadingHour: Number(loadingHour),
					dedicatedFleet: isDedicatedFleet,
					linkedFleetIds: [newFleet.serverId || newFleet.id || ''],
				};

				await indexedDBService.saveRecord('trucks', truck);

				let newTruck = (await indexedDBService.getAllRecords('trucks')).filter(
					(truck: Truck) => truck.registration === truckRegistration
				)[0];

				const assay: Assay = {
					id: crypto.randomUUID(),
					name: sampleId,
					productType: productType,
					dedicatedFleet: isDedicatedFleet,
					linkedTruckIds: [newTruck?.serverId || ''],
					syncStatus: 'pending',
					location: loadingLocation,
					created: new Date(),
					updated: new Date().toISOString(),
					process: 'Truck Load Out', // <-- updated
					sampleId: sampleId,
					siteLocation: 'PMC',
				};

				// Save assay to IndexedDB
				await indexedDBService.saveRecord('assays', assay);

				goto(`/pmc/processes/magnetite-road/truck-load-out/sampling/verification?sampleId=${encodeURIComponent(sampleId)}&truckRegistration=${encodeURIComponent(truckRegistration)}`)
			}else {
				isDedicatedFleet = false;

				// Create truck object
				const truck: Truck = {
					id: crypto.randomUUID(),
					registration: truckRegistration,
					syncStatus: 'pending',
					created: new Date(),
					loadingLocation: loadingLocation,
					dedicatedFleet: isDedicatedFleet,
				};	

				await indexedDBService.saveRecord('trucks', truck);
				await syncService.syncTruck(truck);

				let newTruck = (await indexedDBService.getAllRecords('trucks')).filter(
					(truck: Truck) => truck.registration === truckRegistration
				)[0];

				const assay: Assay = {
					id: crypto.randomUUID(),
					name: sampleId,
					productType: productType,
					dedicatedFleet: isDedicatedFleet,
					linkedTruckIds: [newTruck?.serverId || ''],
					syncStatus: 'pending',
					location: loadingLocation,
					created: new Date(),
					updated: new Date().toISOString(),
					process: 'Truck Load Out',
					sampleId: sampleId,
					siteLocation: 'PMC',
				};
	
				// Save assay to IndexedDB
				await indexedDBService.saveRecord('assays', assay);
				await syncService.syncAssay(assay);

				goto(`/pmc/processes/magnetite-road/truck-load-out/sampling/verification?sampleId=${encodeURIComponent(sampleId)}&truckRegistration=${encodeURIComponent(truckRegistration)}`)
			}
			
		} catch (err) {
			error = 'Failed to submit data';
			console.error(err);
		}
	  }
	  let currentStep = 1;
	  function handleCancel() {
		  goto('/pmc/processes/magnetite-road');
	  }

  </script>
  <ProcessLayout
  title="Truck Load Out"
  {steps}
  {currentStep}
  isSubmitting={false}
  bind:this={processLayout}
  cancelPath="/pmc/processes/magnetite-road"
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
  
		  <h2 class="">Truck Data Capturing</h2>

			<YesNo 
				bind:selected={dedicatedFleet} 
				label={"Dedicated Fleet"} 
				description={"Please specify wether the truck is part of a fleet."}
			/>
			{#if dedicatedFleet}
		  		{#if dedicatedFleet === 'No'}
		  			<FormField
						id="truckRegistration"
						label="Enter the Truck Registration"
						type="text"
						bind:value={truckRegistration}
						placeholder="Enter Truck Registration"
						required
					/>

					<FormField
						id="productType"
						label="Product Type"
						isSelect={true}
						options={[
							{ value: 'Magnetite', label: 'Magnetite-DMS' },
							{ value: 'Magnetite 62%', label: 'Magnetite 62%' },
							{ value: 'Magnetite 65%', label: 'Magnetite 65%' },
							{ value: 'Iron Oxide', label: 'Iron Oxide' }
						]}
						bind:value={productType}
						placeholder="Enter Commodity"
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

					<FormField
						id="loadingLocation"
						label="Loading Location"
						isSelect={true}
						options={[
							{ value: 'West Load Out', label: 'West Load Out' },
							{ value: 'Gravelotte', label: 'Gravelotte' },
							{ value: 'Truck Load Out', label: 'Truck Load Out' }
						]}
						bind:value={loadingLocation}
						required
					/>
				{:else}
					<FormField
						id="truckRegistration"
						label="Enter the Truck Registration"
						type="text"
						bind:value={truckRegistration}
						placeholder="Enter Truck Registration"
						required
					/>

					<FormField
						id="productType"
						label="Product Type"
						isSelect={true}
						options={[
							{ value: 'Magnetite 62%', label: 'Magnetite 62%' },
							{ value: 'Magnetite 65%', label: 'Magnetite 65%' },
							{ value: 'Iron Oxide', label: 'Iron Oxide' }
						]}
						bind:value={productType}
						placeholder="Enter Commodity"
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

					<FormField
						id="loadingLocation"
						label="Loading Location"
						isSelect={true}
						options={[
							{ value: 'West Load Out', label: 'West Load Out' },
							{ value: 'Gravelotte', label: 'Gravelotte' },
							{ value: 'Truck Load Out', label: 'Truck Load Out' }
						]}
						bind:value={loadingLocation}
						required
					/>
					
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
				{/if}
			{/if}
		  
  </ProcessLayout>

  <style>
	.form-field {
		width: 100%;
		margin-bottom: 1.5rem;
	}
	.form-input {
		width: 100%;
		box-sizing: border-box;
		height: 50px;
	}
  </style>