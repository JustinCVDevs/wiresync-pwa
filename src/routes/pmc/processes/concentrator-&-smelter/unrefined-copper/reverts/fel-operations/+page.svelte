<script lang="ts">
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { onMount } from 'svelte';
	import type { Truck } from '$lib/types';
	import { formPersistenceService } from '$lib/services/formPersistenceService';

	let felWeight = '';
	let error = '';
	let processLayout: ProcessLayout;
	let currentStep = 1;
	let isSubmitting = false;

	let truckInput = '';
	let availableTrucks: Truck[] = [];
	let selectedTruck: any = '';

	const steps = ["FEL Details", "Complete"]

	function formatTareTimestamp(date: Date) {
		return new Date(date).toLocaleString('en-GB', {
			day: '2-digit',
			month: '2-digit',
			year: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
	}

	onMount(async () => {
		await getTrucks();
	});

	async function getTrucks() {
		try {
			const today = new Date();
			const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
			const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

			availableTrucks = (await indexedDBService.getAllRecords('trucks')).filter(
				(truck: Truck) => {
					const matchesProduct = truck.productType === 'Reverts';
					if (!truck.tareTimestamp) return false;
					const ts = new Date(truck.tareTimestamp).getTime();
					const isToday = ts >= startOfDay.getTime() && ts <= endOfDay.getTime();
					return matchesProduct && isToday;
				}
			);

			availableTrucks.sort((a, b) => a.registration.localeCompare(b.registration));
		} catch (error) {
			console.error('No trucks available', error);
			return [];
		}
	}
	
	async function handleSubmit() {
		try {
			processLayout.setError('');
			processLayout.setSuccess('');
			isSubmitting = true;

			if (selectedTruck) {
				const truck = availableTrucks.find(truck => truck.registration === selectedTruck);

				if (!truck) {
					throw new Error(`Truck with registration "${selectedTruck}" not found.`);
				}

				const truckLoad = await indexedDBService.getAllRecords('truckLoads').then(loads => 
					loads.find(load => load.truckId === truck.serverId && load.loadingLocation === 'Unrefined Copper')
				);

				if (!truckLoad) {
					throw new Error(`Truck load for "${selectedTruck}" not found.`);
				}

				truckLoad.updated = new Date().toISOString();
				truckLoad.felWeight = felWeight;
				truckLoad.syncStatus = 'pending';
				truckLoad.isWireSynced = false;

				await indexedDBService.updateRecord('truckLoads', truckLoad.id, truckLoad);

				goto(`/pmc/processes/concentrator-&-smelter/unrefined-copper/reverts/fel-operations/verification?sampleId=${encodeURIComponent(truckLoad.sampleId || '')}&truckRegistration=${encodeURIComponent(truck.registration || '')}`);
			}
			formPersistenceService.clearForm('fel-operations-unrefined-copper');	
		} catch (err) {
			error = 'Failed to submit data';
			console.error(err);
			processLayout.setError(error);
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/pmc/processes/concentrator-&-smelter/unrefined-copper/reverts');
	}
</script>
	<ProcessLayout
    title="Copper Concentrate"
    {steps}
    {currentStep}
    {isSubmitting}
    bind:this={processLayout}
    cancelPath="/pmc/processes/concentrator-&-smelter/unrefined-copper/reverts"
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
			<h2 class='header'>Material Data Capturing</h2>
			<span class='note' style="margin-top: -0.2rem; display: block; font-size: 12px;">Please note that every truck has to be sampled</span>

				<div class="form">
					<FormField
						id="truckRegistration"
						label="Select the Truck Registration"
						search={true}
						options={availableTrucks.map((truck) => ({
							value: truck.transRef ?? '',
							label: `${truck.registration} - ${truck.tareTimestamp ? formatTareTimestamp(new Date(truck.tareTimestamp)) : ''}`
						}))}						bind:value={selectedTruck}
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
	</ProcessLayout>
<style>
	.header {
		font-size: 1.3rem;
		font-weight: bold;
		margin-bottom: 0.5rem;
		color: #333;
	}
	.form {
		margin-top: 1rem;
		position: relative;
	}
</style>