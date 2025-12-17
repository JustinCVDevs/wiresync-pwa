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
	import { pocketbaseService } from '$lib/services/pocketbaseService';

	let dedicatedFleet = '';
	let isDedicatedFleet = false;
	let isSubmitting = false;

	let truckRegistration = '';
	let transRef = '';
	let productType = localStorage.getItem('gravelotte-productType') || '';
	let truckDestination = localStorage.getItem('gravelotte-truckDestination') || '';
	let sampleId = '';
	let loadingLocation = 'Gravelotte';
	let loadingTime = '';
	let error = '';
	let processLayout: ProcessLayout;

	const steps = ['Sample Details', 'Complete'];

	let sampleNumberGravelotte = 1;
	let trucks: Truck[] = [];
	let dedicatedFleetTrucks: DedicatedFleetTruck[] = [];
	let productTypes = ['Iron Oxide', 'Magnetite-DMS', 'Magnetite 62%', 'Magnetite 65%'];
	let truckDestinations = ['Bosveld', 'Crosscon', 'CPAL'];

	// Determine today's next sample number from fleet records for Gravelotte
	async function getSampleNumberFromFleet() {
		const now = new Date();
		const startOfDay = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			0,
			0,
			0,
			0
		).getTime();
		const endOfDay = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			23,
			59,
			59,
			999
		).getTime();

		// load all fleet records and compute highest numeric sampleNumber for the selected loadingLocation within today
		const allFleet = (await indexedDBService.getRecords('fleet')).filter(
			(fleet: Fleet) => fleet.loadingLocation === 'Gravelotte' && fleet.truckDestination === truckDestination
		);
		let max = 0;
		
		for (const rec of allFleet) {			
			/// Parse the created date
			const createdDate = rec.created ? new Date(rec.created) : null;
			if (!createdDate || isNaN(createdDate.getTime())) continue;

			// Get timestamp for comparison
			const createdTs = createdDate.getTime();

			// Check if the record was created today (between startOfDay and endOfDay)
			if (createdTs >= startOfDay && createdTs <= endOfDay) {
				const n = Number(rec.sampleNumber);
				if (Number.isFinite(n) && n > max) {
					max = Math.floor(n);
				}
			}
		}

		// no fallback: always return highest found + 1 (will be 1 if none found)
		sampleNumberGravelotte = max + 1;
		return sampleNumberGravelotte;
	}

	$: if (truckDestination) {
		getSampleNumberFromFleet();
	}

	async function getTrucks() {
		const today = new Date();
		const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
		const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

		trucks = (await indexedDBService.getAllRecords('trucks')).filter(
			(truck: Truck) => {
				const matchesProduct = truck.productType === 'Magnetite - DMS';
				if (!truck.tareTimestamp) return false;
				const ts = new Date(truck.tareTimestamp).getTime();
				const isToday = ts >= startOfDay.getTime() && ts <= endOfDay.getTime();
				return matchesProduct && isToday;
			}
		);

		trucks.sort((a, b) => a.registration.localeCompare(b.registration));
	}

	async function getDedicatedFleetTruck() {
		dedicatedFleetTrucks = await indexedDBService.getAllRecords('dedicatedFleetTrucks');

		dedicatedFleetTrucks.sort((a, b) => a.registration.localeCompare(b.registration));
	}

	// Fetch truck records and initialize sample number from IndexedDB on component mount
	onMount(async () => {
		try {
			await getTrucks();
			await getDedicatedFleetTruck();
		} catch (err) {
			console.error('Failed to load trucks from IndexedDB or initialize sample number:', err);
			error = 'Failed to load truck records or sample number';
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

		const suffix = {
			'Bosveld': 'BV',
			'Crosscon': 'CR',
			'CPAL': 'CPAL'
		}[truckDestination];

		if (dedicatedFleet === 'Yes') {
			sampleId = `${YYMMDD}${truckRegistration ? `_${truckRegistration}` : ''}${sampleNumberGravelotte ? `_#${sampleNumberGravelotte}` : ''}${productCode ? `_${productCode}` : ''}${suffix ? `_${suffix}` : ''}`;
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

	$: if (transRef) {
		const selectedTruck = trucks.find(t => t.transRef === transRef);
		truckRegistration = selectedTruck ? selectedTruck.registration : '';
	}

	async function handleSubmit() {
		if (isSubmitting) return;
		if (!truckRegistration) {
			processLayout.setError('Please select a truck registration.');
			return;
		}
		if (!productType) {
			processLayout.setError('Please select a product type.');
			return;
		}
		isSubmitting = true;
		try {
			processLayout.setError('');
			processLayout.setSuccess('');

			await getSampleNumberFromFleet();

			// Save the selected productType to localStorage
			localStorage.setItem('gravelotte-productType', productType);
			localStorage.setItem('gravelotte-truckDestination', truckDestination);

			if (dedicatedFleet === 'Yes') {
				if (!truckDestination) {
					processLayout.setError('Please select a truck destination.');
					return;
				}
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
					truckDestination: truckDestination,
					materialType: 'Coarse',
					registration: truckRegistration,
					felMassKg: 0,
					sampleNumber: sampleNumberGravelotte,
					loadingLocation: loadingLocation,
					loadingHour: `${formattedDate} ${loadingTime}`,
					syncStatus: 'pending',
					siteLocation: 'PMC',
					user: pocketbaseService.currentUser?.id || '',
					created: new Date()
				};

				// Save fleet and fire-and-forget sync
				const [savedFleet] = await Promise.all([
					indexedDBService.saveRecord('fleet', fleet),
					// Don't wait for sync - do it in background
					syncService.syncFleet(fleet).catch(console.warn)
				]);

				const assay: Assay = {
					id: crypto.randomUUID(),
					name: sampleId,
					productType: productType,
					dedicatedFleet: isDedicatedFleet,
					linkedDedicatedFleetTruckIds: linkedTruck?.serverId ? [linkedTruck.serverId] : [],
					linkedFleetIds: [fleet.id],
					syncStatus: 'pending',
					location: loadingLocation,
					created: new Date(),
					updated: new Date().toISOString(),
					sampleId: sampleId,
					user: pocketbaseService.currentUser?.id || '',
					siteLocation: 'PMC'
				};

				// Save assay and navigate immediately
				await indexedDBService.saveRecord('assays', assay);
				// Sync in background
				syncService.syncAssay(assay).catch(console.warn);

				goto(
					`/pmc/processes/magnetite-road/gravelotte/sampling/verification?sampleId=${encodeURIComponent(sampleId)}&truckRegistration=${encodeURIComponent(truckRegistration)}`
				);
			} else {
				isDedicatedFleet = false;

				// Find linked truck using getRecords with filter (more efficient)
				const linkedTrucks = await indexedDBService.getRecords(
					'trucks',
					(truck: Truck) => truck.transRef === transRef
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
					user: pocketbaseService.currentUser?.id || '',
					siteLocation: 'PMC'
				};

				// Save truckLoad
				await indexedDBService.saveRecord('truckLoads', truckLoad);

				const assay: Assay = {
					id: crypto.randomUUID(),
					name: sampleId,
					productType: productType,
					dedicatedFleet: isDedicatedFleet,
					linkedTruckLoadIds: [truckLoad.id],
					linkedTruckIds: linkedTruck?.serverId ? [linkedTruck.serverId] : [],
					syncStatus: 'pending',
					location: loadingLocation,
					created: new Date(),
					updated: new Date().toISOString(),
					sampleId: sampleId,
					user: pocketbaseService.currentUser?.id || '',
					siteLocation: 'PMC'
				};

				// Save assay and navigate immediately
				await indexedDBService.saveRecord('assays', assay);
				// Sync in background
				syncService.syncAssay(assay).catch(console.warn);

				goto(
					`/pmc/processes/magnetite-road/gravelotte/sampling/verification?sampleId=${encodeURIComponent(sampleId)}&truckRegistration=${encodeURIComponent(truckRegistration)}`
				);
			}
		} catch (err) {
			error = 'Failed to submit data';
			console.error(err);
		} finally {
			isSubmitting = false;
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
	{isSubmitting}
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
						value: truck.transRef ?? '',
						label: truck.registration
					}))}
					bind:value={transRef}
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
				disabled={true}
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
				id="truckDestination"
				label="Truck Destination"
				isSelect={true}
				options={truckDestinations.map((type) => ({ value: type, label: type }))}
				bind:value={truckDestination}
				placeholder="Select Truck Destination"
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
