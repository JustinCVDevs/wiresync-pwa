<script lang="ts">
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay, Truck, TruckLoad } from '$lib/types';
	import FormField from '$lib/components/FormField.svelte';
	import { syncService } from '$lib/services/syncService';
	import { onMount } from 'svelte';
	import QRPrinting from '$lib/components/QRPrinting.svelte';
	import { pocketbaseService } from '$lib/services/pocketbaseService';

	let truckRegistration = '';
	let transRef = '';
	let materialType = 'HG';
	let sampleId = '';
	let loadingLocation = 'HG Concentrate';
	let error = '';
	let processLayout: ProcessLayout;
	let trucks: Truck[] = [];
	let showDropdown = false;
	let isSubmitting = false;

	const steps = ['Sample Details', 'Complete'];

	$: {
		const currentDate = new Date();
		const YYMMDD = `${currentDate.getFullYear().toString().slice(-2)}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;

		const productCode = {
			HG: 'HG',
			LG: 'LG',
			Reverts: 'REV'
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

	$: if (transRef) {
		const selectedTruck = trucks.find(t => t.transRef === transRef);
		truckRegistration = selectedTruck ? selectedTruck.registration : '';
	}

	// Fetch truck records from IndexedDB on component mount
	onMount(async () => {
		try {
			const today = new Date();
			const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
			const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

			trucks = (await indexedDBService.getAllRecords('trucks')).filter(
				(truck: Truck) => {
					const matchesProduct = truck.productType === 'HG';
					if (!truck.tareTimestamp) return false;
					const ts = new Date(truck.tareTimestamp).getTime();
					const isToday = ts >= startOfDay.getTime() && ts <= endOfDay.getTime();
					return matchesProduct && isToday;
				}
			);

			trucks.sort((a, b) => a.registration.localeCompare(b.registration));
		} catch (err) {
			console.error('Failed to load trucks from IndexedDB:', err);
			error = 'Failed to load truck records';
		}
	});

	function formatTareTimestamp(date: Date) {
		return new Date(date).toLocaleString('en-GB', {
			day: '2-digit',
			month: '2-digit',
			year: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
			timeZone: 'UTC'
		});
	}

	async function handleSubmit() {
		try {
			processLayout.setError('');
			processLayout.setSuccess('');
			isSubmitting = true;

			if (!truckRegistration) {
				throw new Error('Truck Registration is required for Dedicated Fleet');
			}

			let linkTruck = (await indexedDBService.getAllRecords('trucks')).filter(
				(truck: Truck) => truck.transRef === transRef
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
				user: pocketbaseService.currentUser?.id || '',
				syncStatus: 'pending'
			};

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
				user: pocketbaseService.currentUser?.id || '',
				siteLocation: 'PMC'
			};

			await indexedDBService.saveRecord('assays', assay);
			await syncService.syncAssay(assay);

			goto(
				`/pmc/processes/concentrator-&-smelter/unrefined-copper/hg-concentrate/sampling/verification?sampleId=${encodeURIComponent(sampleId)}&truckTransRef=${encodeURIComponent(transRef)}`
			);
		} catch (err) {
			error = 'Failed to submit data';
			console.error(err);
		} finally {
			isSubmitting = false;
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
	{isSubmitting}
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

	<h2 class="header">Truck Details Capturing</h2>
	<span class="note" style="margin-top: -0.2rem; display: block; font-size: 12px;"
		>Please note that every truck has to be sampled</span
	>

	<div class="form-field">
		<FormField
			id="truckRegistration"
			label="Select the Truck Registration"
			search={true}
			options={trucks.map((truck) => ({
				value: truck.transRef ?? '',
				label: `${truck.registration} - ${truck.tareTimestamp ? formatTareTimestamp(new Date(truck.tareTimestamp)) : ''}`
			}))}			
			bind:value={transRef}
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
