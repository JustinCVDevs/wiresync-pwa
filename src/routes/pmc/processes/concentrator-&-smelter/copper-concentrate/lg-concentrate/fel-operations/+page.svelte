<script lang="ts">
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { onMount } from 'svelte';
	import { formPersistenceService } from '$lib/services/formPersistenceService';
  
	let felWeight = '';
	let error = '';
	let processLayout: ProcessLayout;

	let truckInput = '';
	let availableTrucks: any[] = [];
	let selectedTruck: any = '';

	const steps = ["FEL Details", "Complete"]

	onMount(async () => {
		availableTrucks = await getTrucks();
	});

	async function getTrucks() {
		try {
			// Fetch all trucks
			const allTrucks = await indexedDBService.getAllRecords('trucks');

			// Fetch all truck loads with the correct loading location
			const truckLoads = (await indexedDBService.getAllRecords('truckLoads')).filter(
				(load) => load.loadingLocation === 'LG Concentrate' && load.felWeight === ''
			);

			// Filter trucks where the truckId matches the truckLoad's truckId
			const linkedTrucks = allTrucks.filter((truck) =>
				truckLoads.some((load) => load.truckId === truck.serverId)
			);

			// Sort the filtered trucks alphabetically by registration
			return linkedTrucks.sort((a, b) => a.registration.localeCompare(b.registration));
		} catch (error) {
			console.error('No trucks available', error);
			return [];
		}
	}
	
	async function handleSubmit() {
		try {
			processLayout.setError('');
			processLayout.setSuccess('');
			if (selectedTruck) {
				const truck = availableTrucks.find(truck => truck.registration === selectedTruck);

				if (!truck) {
					throw new Error(`Truck with registration "${selectedTruck}" not found.`);
				}

				const truckLoad = await indexedDBService.getAllRecords('truckLoads').then(loads => 
					loads.find(load => load.truckId === truck.serverId && load.loadingLocation === 'LG Concentrate')
				);

				if (!truckLoad) {
					throw new Error(`Truck load for "${selectedTruck}" not found.`);
				}

				truckLoad.updated = new Date().toISOString();
				truckLoad.felWeight = felWeight;
				truckLoad.syncStatus = 'pending';

				await indexedDBService.updateRecord('truckLoads', truckLoad.id, truckLoad);

				goto(`/pmc/processes/concentrator-&-smelter/copper-concentrate/lg-concentrate/fel-operations/verification?sampleId=${encodeURIComponent(truckLoad.sampleId || '')}&truckRegistration=${encodeURIComponent(truck.registration || '')}`);
			}
			formPersistenceService.clearForm('fel-operations-lg-concentrate');
		} catch (err) {
			error = 'Failed to submit data';
			console.error(err);
		}
	  }
	  let currentStep = 1;
	  function handleCancel() {
		  goto('/pmc/processes/concentrator-&-smelter');
	  }

	$: if (truckInput !== '') {
		(async () => {
			availableTrucks = await getTrucks();
		})();
	}
</script>
	<ProcessLayout
    title="Copper Concentrate"
    {steps}
    {currentStep}
    isSubmitting={false}
    bind:this={processLayout}
    cancelPath="/pmc/processes/concentrator-&-smelter"
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
						options={availableTrucks.map((truck) => ({ value: truck.registration, label: truck.registration }))} 
						bind:value={selectedTruck}
						placeholder="Select Truck Registration"
						required
					/>
				</div>

				<FormField
					id="felWeight"
					label="FEL Weight (Tons)"
					type="number"
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