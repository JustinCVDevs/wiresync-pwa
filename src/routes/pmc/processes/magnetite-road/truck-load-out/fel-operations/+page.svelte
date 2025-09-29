<script lang="ts">
	import YesNo from '$lib/components/YesNo.svelte';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { onMount } from 'svelte';
	import { formPersistenceService } from '$lib/services/formPersistenceService';
	import type { DedicatedFleetTruck } from '$lib';
	import type { Truck } from '$lib/types';

	let dedicatedFleet = '';
	let isDedicatedFleet = false;
	let isSubmitting = false;

	let felWeight = '';
	let loadingLocation = 'Truck Load Out';
	let error = '';
	let processLayout: ProcessLayout;

	let selectedTruck: any = '';
	let trucks: Truck[] = [];
	let dedicatedFleetTrucks: DedicatedFleetTruck[] = [];

	const steps = ['FEL Details', 'Complete'];

	onMount(async () => {
		try {
			await getTrucks();
			await getDedicatedFleetTruck();
		} catch (err) {
			console.error('Failed to load trucks from IndexedDB:', err);
			error = 'Failed to load truck records';
		}
	});

	async function getTrucks() {
		trucks = await indexedDBService.getAllRecords('trucks');

		trucks.sort((a, b) => a.registration.localeCompare(b.registration));
	}

	async function getDedicatedFleetTruck() {
		dedicatedFleetTrucks = await indexedDBService.getAllRecords('dedicatedFleetTrucks');

		dedicatedFleetTrucks.sort((a, b) => a.registration.localeCompare(b.registration));
	}

	async function handleSubmit() {
		isSubmitting = true;
		try {
			processLayout.setError('');
			processLayout.setSuccess('');

			if (dedicatedFleet === 'Yes') {
				isDedicatedFleet = true;

				if (selectedTruck) {
					const fleet = (await indexedDBService.getAllRecords('fleet')).find(
						(f) => f.registration === selectedTruck
					);

					if (!fleet) {
						throw new Error(`Truck with registration "${selectedTruck}" not found.`);
					}

					await indexedDBService.updateRecord('fleet', fleet.id, {
						loadingLocation: loadingLocation,
						syncStatus: 'pending',
						felMassKg: Number(felWeight)
					});
					formPersistenceService.clearForm('fel-operations-truck-load-out');
					goto(
						`/pmc/processes/magnetite-road/truck-load-out/fel-operations/verification?truckRegistration=${encodeURIComponent(selectedTruck || '')}&sampleId=${encodeURIComponent(fleet?.sampleId || '')}`
					);
				}
			} else {
				isDedicatedFleet = false;

				if (selectedTruck) {
					const truck = trucks.find((truck) => truck.registration === selectedTruck);

					if (!truck) {
						throw new Error(`Truck with registration "${selectedTruck}" not found.`);
					}

					const truckLoad = await indexedDBService
						.getAllRecords('truckLoads')
						.then((loads) => loads.find((load) => load.truckId === truck.serverId));

					await indexedDBService.updateRecord('truckLoads', truckLoad?.id ?? '', {
						loadingLocation: loadingLocation,
						syncStatus: 'pending',
						felWeight: felWeight
					});
					formPersistenceService.clearForm('fel-operations-truck-load-out');
					goto(
						`/pmc/processes/magnetite-road/truck-load-out/fel-operations/verification?truckRegistration=${encodeURIComponent(selectedTruck || '')}&sampleId=${encodeURIComponent(truckLoad?.sampleId || '')}`
					);
				}
				formPersistenceService.clearForm('fel-operations-truck-load-out');
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
		goto('/pmc/processes/magnetite-road/truck-load-out');
	}
</script>

<ProcessLayout
	title="Truck Load Out"
	{steps}
	{currentStep}
	isSubmitting={isSubmitting}
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
	<h2 class="">Material Data Capturing</h2>
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
					label="Truck Registration"
					search={true}
					options={trucks.map((truck) => ({
						value: truck.registration,
						label: truck.registration
					}))}
					bind:value={selectedTruck}
					placeholder="Select Truck Registration"
					required
				/>
			</div>
			<FormField
				id="felWeight"
				label="FEL Weight (Tons)"
				type="number"
				step="0.01"
				bind:value={felWeight}
				placeholder="Enter FEL Weight"
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
					label="Truck Registration"
					search={true}
					options={dedicatedFleetTrucks.map((truck) => ({
						value: truck.registration,
						label: truck.registration
					}))}
					bind:value={selectedTruck}
					placeholder="Select Truck Registration"
					required
				/>
			</div>
			<FormField
				id="felWeight"
				label="FEL Weight (Tons)"
				type="number"
				step="0.01"
				bind:value={felWeight}
				placeholder="Enter FEL Weight"
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
		{/if}
	{/if}
</ProcessLayout>

<style>
	.form-field {
		margin-top: 1rem;
		position: relative;
	}
</style>
