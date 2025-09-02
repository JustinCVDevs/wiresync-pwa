<script lang="ts">
	import YesNo from '$lib/components/YesNo.svelte';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay, Fleet, Truck, TruckLoad } from '$lib/types';
	import FormField from '$lib/components/FormField.svelte';
	import { syncService } from '$lib/services/syncService';
	import { onMount } from 'svelte';
	import type { DedicatedFleetTruck } from '$lib';
	import QrPrinting from '$lib/components/QRPrinting.svelte';

	let dedicatedFleet = '';
	let isDedicatedFleet = false;

	let truckRegistration = '';
	let productType = localStorage.getItem('gravelotte-productType') || '';
	let sampleId = '';
	let loadingLocation = 'Gravelotte';
	let loadingTime = '';
	let error = '';
	let processLayout: ProcessLayout;

	const steps = ["Sample Details", "Complete"];

	let sampleNumberGravelotte = 1;
	let trucks: Truck[] = [];
	let dedicatedFleetTrucks: DedicatedFleetTruck[] = [];
	let productTypes = ['Iron Oxide', 'Magnetite-DMS', 'Magnetite 62%', 'Magnetite 65%'];

	// Function to get or reset the sample number for the day
	function getSampleNumber() {
		const currentDate = new Date().toISOString().split('T')[0];
		const storedData = JSON.parse(localStorage.getItem('sampleNumberGravelotte') || '{}');

		if (storedData.date === currentDate) {
			sampleNumberGravelotte = storedData.number + 1;
		} else {
			sampleNumberGravelotte = 1;
		}

		// Save the updated sample number in localStorage
		localStorage.setItem(
			'sampleNumberGravelotte',
			JSON.stringify({ date: currentDate, number: sampleNumberGravelotte })
		);
	}

	// Call the function to initialize the sample number
	getSampleNumber();

	async function getTrucks() {
		trucks = await indexedDBService.getAllRecords('trucks');

        trucks.sort((a, b) => a.registration.localeCompare(b.registration));
	}

	async function getDedicatedFleetTruck() {
		dedicatedFleetTrucks = await indexedDBService.getAllRecords('dedicatedFleetTrucks');

		dedicatedFleetTrucks.sort((a, b) => a.registration.localeCompare(b.registration));
	}

	// Fetch truck records from IndexedDB on component mount
	onMount(async () => {
		try {
			getTrucks();
			getDedicatedFleetTruck();
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
			'Magnetite 62%': 'MAG62',
			'Magnetite 65%': 'MAG65'
		}[productType];

		if (dedicatedFleet === 'Yes') {
			sampleId = `${YYMMDD}${truckRegistration ? `_${truckRegistration}` : ''}${sampleNumberGravelotte ? `_#${sampleNumberGravelotte}` : ''}${productCode ? `_${productCode}` : ''}`;
		} else {
			sampleId = `${YYMMDD}${truckRegistration ? `_${truckRegistration}` : ''}${productCode ? `_${productCode}` : ''}`;
		}
	}

	$: {
        if (dedicatedFleet === 'Yes') {
            const currentDate = new Date();
            const currentHour = String(currentDate.getHours()).padStart(2, '0');
            const currentMinutes = String(currentDate.getMinutes()).padStart(2, '0');
            loadingTime = `${currentHour}:${currentMinutes}`;
        }
    }

	$: {
		productTypes = dedicatedFleet === 'No'
            ? ['Iron Oxide', 'Magnetite-DMS', 'Magnetite 62%', 'Magnetite 65%']
            : ['Iron Oxide', 'Magnetite 62%', 'Magnetite 65%'];
	}

	$: if (truckRegistration && dedicatedFleet === 'No') {
		updateProductType();
	}

	async function updateProductType() {
		if (truckRegistration) {
			const truck = trucks.find(t => t.registration === truckRegistration);
			productType = truck?.productType || '';
		}
	}

	async function handleSubmit() {
		try {
			processLayout.setError('');
			processLayout.setSuccess('');

			// Save the selected productType to localStorage
			localStorage.setItem('gravelotte-productType', productType);

			if (dedicatedFleet === 'Yes') {
				isDedicatedFleet = true;

				// Create fleet object
				const fleet: Fleet = {
					id: crypto.randomUUID(),
					sampleId,
					commodity: productType,
					materialType: 'Coarse',
					registration: truckRegistration,
					felMassKg: 0,
					loadingLocation: loadingLocation,
					loadingHour: loadingTime,
					syncStatus: 'pending',
					siteLocation: 'PMC',
					created: new Date(),
				};

				await indexedDBService.saveRecord('fleet', fleet);
				await syncService.syncFleet(fleet);

				let newFleet = (await indexedDBService.getAllRecords('fleet')).filter(
					(fleet: Fleet) => fleet.sampleId === sampleId
				)[0];

				let linkedTruck = (await indexedDBService.getAllRecords('dedicatedFleetTrucks')).filter(
					(truck: DedicatedFleetTruck) => truck.registration === truckRegistration
				)[0];

				const assay: Assay = {
					id: crypto.randomUUID(),
					name: sampleId,
					productType: productType,
					dedicatedFleet: isDedicatedFleet,
					linkedDedicatedFleetTruckIds: [linkedTruck?.serverId || ''],
					linkedFleetIds: [newFleet?.serverId || ''],
					syncStatus: 'pending',
					location: loadingLocation,
					created: new Date(),
					updated: new Date().toISOString(),
					sampleId: sampleId,
					siteLocation: 'PMC',
				};

				// Save assay to IndexedDB
				await indexedDBService.saveRecord('assays', assay);
				await syncService.syncAssay(assay);

				goto(`/pmc/processes/magnetite-road/gravelotte/sampling/verification?sampleId=${encodeURIComponent(sampleId)}&truckRegistration=${encodeURIComponent(truckRegistration)}`)
			}else {
				isDedicatedFleet = false;

				let linkedTruck = (await indexedDBService.getAllRecords('trucks')).filter(
					(truck: Truck) => truck.registration === truckRegistration
				)[0];

				// Create truckLoad object
				const truckLoad: TruckLoad = {
					id: crypto.randomUUID(),
					materialType: productType,
					truckId: linkedTruck?.serverId || '',
					sampleId: sampleId,
					syncStatus: 'pending',
					created: new Date(),
					loadingLocation: loadingLocation,
					siteLocation: 'PMC'
				};

				await indexedDBService.saveRecord('truckLoads', truckLoad);
				await syncService.syncTruckLoad(truckLoad);

				let newTruckLoad = (await indexedDBService.getAllRecords('truckLoads')).filter(
					(truckLoad: TruckLoad) => truckLoad.sampleId === sampleId
				)[0];

				const assay: Assay = {
					id: crypto.randomUUID(),
					name: sampleId,
					productType: productType,
					dedicatedFleet: isDedicatedFleet,
					linkedTruckLoadIds: [newTruckLoad?.serverId || ''],
					linkedTruckIds: [linkedTruck?.serverId || ''],
					syncStatus: 'pending',
					location: loadingLocation,
					created: new Date(),
					updated: new Date().toISOString(),
					sampleId: sampleId,
					siteLocation: 'PMC',
				};

				// Save assay to IndexedDB
				await indexedDBService.saveRecord('assays', assay);
				await syncService.syncAssay(assay);

				goto(`/pmc/processes/magnetite-road/gravelotte/sampling/verification?sampleId=${encodeURIComponent(sampleId)}&truckRegistration=${encodeURIComponent(truckRegistration)}`)
			}
			
		} catch (err) {
			error = 'Failed to submit data';
			console.error(err);
		}
	  }
	  let currentStep = 1;
	  function handleCancel() {
		  goto('/pmc/processes/magnetite-road/gravelotte');
	  }

  </script>
  <ProcessLayout
  title="Gravelotte"
  {steps}
  {currentStep}
  isSubmitting={false}
  bind:this={processLayout}
  cancelPath="/pmc/processes/magnetite-road/gravelotte"
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
							search={true}
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

					<QrPrinting {sampleId} />
				{:else}
					<div class='form-field'>
						<FormField
							id="truckRegistration"
							label="Select the Truck Registration"
							search={true}
							options={dedicatedFleetTrucks.map((truck) => ({ value: truck.registration, label: truck.registration }))}
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
						<label for="loadingTime" class="block font-medium text-gray text-sm mb-1">Loading Time (hh:mm) *</label>
						<input
							id="loadingTime"
							type="text"
							bind:value={loadingTime}
							maxlength="5"
							pattern="^([01]\d|2[0-3]):([0-5]\d)$"
							placeholder="Enter time (hh:mm)"
							required
							class="w-full rounded-lg text-sm border px-3 py-2 text-gray border-gray-300 focus:ring-2 focus:ring-gray-400 focus:outline-none"
						/>
					</div>

					<QrPrinting {sampleId} />
				{/if}
			{/if}
		  
  </ProcessLayout>

  <style>
	.form-field {
		margin-top: 1rem;
		position: relative;
	}
  </style>