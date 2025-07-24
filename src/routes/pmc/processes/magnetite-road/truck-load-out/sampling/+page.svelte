<script lang="ts">
	import YesNo from '$lib/components/YesNo.svelte';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay, Fleet, Truck } from '$lib/types';
	import { syncService } from '$lib/services/syncService';
	import { onMount } from 'svelte';

	let dedicatedFleet = '';
	let isDedicatedFleet = false;

	let truckRegistration = '';
	let productType = '';
	let sampleId = '';
	let loadingLocation = 'Truck Load Out';
	let loadingTime = '';
	let error = '';
	let processLayout: ProcessLayout;

	const steps = ["Sample Details", "Complete"];

	let sampleNumber = 1;
	let trucks: Truck[] = [];

	// Function to get or reset the sample number for the day
	function getSampleNumber() {
		const currentDate = new Date().toISOString().split('T')[0];
		const storedData = JSON.parse(localStorage.getItem('sampleNumber') || '{}');

		if (storedData.date === currentDate) {
			sampleNumber = storedData.number + 1;
		} else {
			sampleNumber = 1;
		}

		// Save the updated sample number in localStorage
		localStorage.setItem(
			'sampleNumber',
			JSON.stringify({ date: currentDate, number: sampleNumber })
		);
	}

	// Call the function to initialize the sample number
	getSampleNumber();

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

	$: {
		const currentDate = new Date();
		const YYMMDD = `${currentDate.getFullYear().toString().slice(-2)}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;

		const productCode = {
			'Iron Oxide': 'IOX',
			'Magnetite-DMS': 'DMS',
			'Magnetite-62%': 'MAG62',
			'Magnetite-65%': 'MAG65'
		}[productType];

		if (dedicatedFleet === 'Yes') {
			sampleId = `${YYMMDD}${truckRegistration ? `_${truckRegistration}` : ''}${sampleNumber ? `_#${sampleNumber}` : ''}${productCode ? `_${productCode}` : ''}`;
		} else {
			sampleId = `${YYMMDD}${truckRegistration ? `_${truckRegistration}` : ''}${productCode ? `_${productCode}` : ''}`;
		}
	}

	$: {
        if (dedicatedFleet === 'Yes') {
            const currentHour = new Date().getHours();
            loadingTime = String(currentHour).padStart(2, '0');
        }
    }

	const productTypes = ['Iron Oxide', 'Magnetite-DMS', 'Magnetite-62%', 'Magnetite-65%'];

	async function handleSubmit() {
		try {
			processLayout.setError('');
			processLayout.setSuccess('');

			if (dedicatedFleet === 'Yes') {
				isDedicatedFleet = true;

				const fleet: Fleet = {
					id: crypto.randomUUID(),
					sampleId,
					commodity: productType,
					materialType: 'Coarse',
					registration: truckRegistration,
					felMassKg: 0,
					loadingLocation: loadingLocation,
					loadingHour: Number(loadingTime),
					syncStatus: 'pending',
					siteLocation: 'PMC',
					created: new Date(),
				};

				await indexedDBService.saveRecord('fleet', fleet);
				await syncService.syncFleet(fleet);

				let newFleet = (await indexedDBService.getAllRecords('fleet')).filter(
					(fleet: Fleet) => fleet.sampleId === sampleId
				)[0];

				// Create truck object
				const truck: Truck = {
					id: crypto.randomUUID(),
					registration: truckRegistration,
					syncStatus: 'pending',
					created: new Date(),
					loadingLocation: loadingLocation,
					loadingHour: Number(loadingTime),
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
					linkedFleetIds: [newFleet?.serverId || ''],
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
			}else {
				isDedicatedFleet = false;

				// Create truck object
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
		  goto('/pmc/processes/magnetite-road/truck-load-out');
	  }

  </script>
  <ProcessLayout
  title="Truck Load Out"
  {steps}
  {currentStep}
  isSubmitting={false}
  bind:this={processLayout}
  cancelPath="/pmc/processes/magnetite-road/truck-load-out"
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
				description={"Please specify whether the truck is part of a fleet."}
			/>
			{#if dedicatedFleet}
		  		{#if dedicatedFleet === 'No'}
		  			<div class='form-field'>
						<FormField
							id="truckRegistration"
							label="Select the Truck Registration"
							isSelect={true}
							options={trucks.map((truck) => ({ value: truck.registration, label: truck.registration }))}
							bind:value={truckRegistration}
							placeholder="Select Truck Registration"
							required
						/>
					</div>

					<FormField
						id="productType"
						label="Product Type"
						isSelect={true}
						options={productTypes.map((type) => ({ value: type, label: type }))}
						bind:value={productType}
						placeholder="Select Product Type"
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
					<div class='form-field'>
						<FormField
							id="truckRegistration"
							label="Select the Truck Registration"
							isSelect={true}
							options={trucks.map((truck) => ({ value: truck.registration, label: truck.registration }))}
							bind:value={truckRegistration}
							placeholder="Select Truck Registration"
							required
						/>
					</div>

					<FormField
						id="productType"
						label="Product Type"
						isSelect={true}
						options={productTypes.map((type) => ({ value: type, label: type }))}
						bind:value={productType}
						placeholder="Select Product Type"
						required
					/>

					<FormField
						id="sampleId"
						label="Sample ID"
						type="text"
						bind:value={sampleId}
						disabled={true}
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
						<label for="loadingTime" class="block font-medium text-gray text-sm">Loading Time (00-23) *</label>
						<input
							id="loadingTime"
							type="text"
							bind:value={loadingTime}
							maxlength="2"
							pattern="[0-9]*"
							placeholder="Enter hour (00-23)"
							required
							class="w-full rounded-lg text-sm border px-3 py-2 text-gray border-gray-300 focus:ring-2 focus:ring-gray-400 focus:outline-none"
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
  </style>