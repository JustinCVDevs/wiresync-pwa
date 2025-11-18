<script lang="ts">
	import YesNo from '$lib/components/YesNo.svelte';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay, Fleet, Truck, TruckLoad } from '$lib/types';
	import { syncService } from '$lib/services/syncService';
	import { onMount } from 'svelte';
	import type { DedicatedFleetTruck } from '$lib';

	let dedicatedFleet = '';
	let isDedicatedFleet = false;
	let isSubmitting = false;

	let truckRegistration = '';
	let productType = localStorage.getItem('truck-productType') || '';
	let sampleId = '';
	let loadingLocation = 'Truck Load Out';
	let loadingTime = '';
	let error = '';
	let processLayout: ProcessLayout;
	let currentStep = 1;

	const steps = ['Sample Details', 'Complete'];

	let sampleNumberTruck = 1;
	let trucks: Truck[] = [];
	let dedicatedFleetTrucks: DedicatedFleetTruck[] = [];
	let productTypes = ['Iron Oxide', 'Magnetite-DMS', 'Magnetite 62%', 'Magnetite 65%'];

	// Function to get or reset the sample number for the day
	// Function to determine today's (00:00-23:59) next sample number from the fleet table
	async function getSampleNumberFromFleet() {
		const now = new Date();
		const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
		const id = `counter:${loadingLocation}:${todayStr}`;
		const existing = await indexedDBService.getRecord('deviceCounters', id);
		sampleNumberTruck = ((existing?.lastNumber as number) || 0) + 1;
		return sampleNumberTruck;
	}

	async function getTrucks() {
		trucks = (await indexedDBService.getAllRecords('trucks')).filter(
			(truck: Truck) => truck.productType === 'Magnetite - DMS'
		);

		trucks.sort((a, b) => a.registration.localeCompare(b.registration));
	}

	async function getDedicatedFleetTruck() {
		dedicatedFleetTrucks = await indexedDBService.getAllRecords('dedicatedFleetTrucks');

		dedicatedFleetTrucks.sort((a, b) => a.registration.localeCompare(b.registration));
	}

	// Fetch truck records from IndexedDB on component mount
	onMount(async () => {
		try {
			await getTrucks();
			await getDedicatedFleetTruck();
			await getSampleNumberFromFleet();
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
			sampleId = `${YYMMDD}${truckRegistration ? `_${truckRegistration}` : ''}${sampleNumberTruck ? `_#${sampleNumberTruck}` : ''}${productCode ? `_${productCode}` : ''}`;
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
		productTypes =
			dedicatedFleet === 'No'
				? ['Iron Oxide', 'Magnetite-DMS', 'Magnetite 62%', 'Magnetite 65%']
				: ['Iron Oxide', 'Magnetite 62%', 'Magnetite 65%'];
	}

	$: if (truckRegistration && dedicatedFleet === 'No') {
		const truck = trucks.find((t) => t.registration === truckRegistration);
		if (truck && productType !== truck.productType) {
			productType = truck.productType || '';
		}
	}

	async function handleSubmit() {
		isSubmitting = true;
		try {
			processLayout.setError('');
			processLayout.setSuccess('');

			await getSampleNumberFromFleet();

			// Save the selected productType to localStorage
			localStorage.setItem('truck-productType', productType);

			if (dedicatedFleet === 'Yes') {
				isDedicatedFleet = true;

				// Find linked truck using getRecords with filter (more efficient)
				const linkedTrucks = await indexedDBService.getRecords(
					'dedicatedFleetTrucks',
					(truck: DedicatedFleetTruck) => truck.registration === truckRegistration
				);
				const linkedTruck = linkedTrucks[0];

				// Format current date as yyyy/mm/dd
				const now = new Date();
				const yyyy = now.getFullYear();
				const mm = String(now.getMonth() + 1).padStart(2, '0');
				const dd = String(now.getDate()).padStart(2, '0');
				const formattedDate = `${yyyy}/${mm}/${dd}`;

				// Create fleet object
				const fleet: Fleet = {
					id: crypto.randomUUID(),
					sampleId,
					commodity: productType,
					materialType: 'Coarse',
					registration: truckRegistration,
					felMassKg: 0,
					sampleNumber: sampleNumberTruck,
					loadingLocation: loadingLocation,
					loadingHour: `${formattedDate} ${loadingTime}`,
					syncStatus: 'pending',
					siteLocation: 'PMC',
					created: new Date()
				};

				await indexedDBService.saveRecord('fleet', fleet);
				syncService.syncFleet(fleet).catch(console.warn);
				const t = new Date();
				const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
				await indexedDBService.saveRecord('deviceCounters', { id: `counter:${loadingLocation}:${todayStr}`, date: todayStr, location: loadingLocation, lastNumber: sampleNumberTruck });

				const assay: Assay = {
					id: crypto.randomUUID(),
					name: sampleId,
					productType: productType,
					dedicatedFleet: isDedicatedFleet,
					linkedDedicatedFleetTruckIds: [linkedTruck?.serverId || ''],
					linkedFleetIds: [fleet.id], // Use the fleet ID directly
					syncStatus: 'pending',
					location: loadingLocation,
					created: new Date(),
					updated: new Date().toISOString(),
					sampleId: sampleId,
					siteLocation: 'PMC'
				};

				// Save assay and navigate immediately
				await indexedDBService.saveRecord('assays', assay);
				// Sync in background
				syncService.syncAssay(assay).catch(console.warn);

				goto(
					`/pmc/processes/magnetite-road/truck-load-out/sampling/verification?sampleId=${encodeURIComponent(sampleId)}&truckRegistration=${encodeURIComponent(truckRegistration)}`
				);
			} else {
				isDedicatedFleet = false;

				// Find linked truck using getRecords with filter (more efficient)
				const linkedTrucks = await indexedDBService.getRecords(
					'trucks',
					(truck: Truck) => truck.registration === truckRegistration
				);
				const linkedTruck = linkedTrucks[0];

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

				// Save truckLoad
				await indexedDBService.saveRecord('truckLoads', truckLoad);

				const assay: Assay = {
					id: crypto.randomUUID(),
					name: sampleId,
					productType: productType,
					dedicatedFleet: isDedicatedFleet,
					linkedTruckLoadIds: [truckLoad.id], // Use the truckLoad ID directly
					linkedTruckIds: [linkedTruck?.serverId || ''],
					syncStatus: 'pending',
					location: loadingLocation,
					created: new Date(),
					updated: new Date().toISOString(),
					sampleId: sampleId,
					siteLocation: 'PMC'
				};

				// Save assay and navigate immediately
				await indexedDBService.saveRecord('assays', assay);
				// Sync in background
				syncService.syncAssay(assay).catch(console.warn);

				goto(
					`/pmc/processes/magnetite-road/truck-load-out/sampling/verification?sampleId=${encodeURIComponent(sampleId)}&truckRegistration=${encodeURIComponent(truckRegistration)}`
				);
			}
		} catch (err) {
			error = 'Failed to submit data';
			console.error(err);
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/pmc/processes/magnetite-road/truck-load-out');
	}
</script>

<ProcessLayout
	title="Truck Load Out"
	{steps}
	{currentStep}
	{isSubmitting}
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
		label={'Dedicated Fleet'}
		description={'Select YES for CPAL, Crosscon and Bosveld trucks. Select NO for trucks loading DMS.'}
	/>
	{#if dedicatedFleet}
		{#if dedicatedFleet === 'No'}
			<div class="form-field">
				<FormField
					id="truckRegistration"
					label="Select the Truck Registration"
					search={true}
					options={trucks.map((truck) => ({
						value: truck.registration,
						label: truck.registration
					}))}
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
			<div class="form-field">
				<FormField
					id="truckRegistration"
					label="Select the Truck Registration"
					search={true}
					options={dedicatedFleetTrucks.map((truck) => ({
						value: truck.registration,
						label: truck.registration
					}))}
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
				<label for="loadingTime" class="text-gray mb-1 block text-sm font-medium"
					>Loading Time (hh:mm) *</label
				>
				<input
					id="loadingTime"
					type="text"
					bind:value={loadingTime}
					maxlength="5"
					pattern="^([01]\d|2[0-3]):([0-5]\d)$"
					placeholder="Enter time (hh:mm)"
					required
					class="text-gray w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
				/>
			</div>
		{/if}
	{/if}
</ProcessLayout>

<style>
	.form-field {
		margin-top: 1rem;
		position: relative;
	}
</style>
