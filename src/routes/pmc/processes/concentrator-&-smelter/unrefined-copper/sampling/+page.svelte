<script lang="ts">
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay, Truck } from '$lib/types';
	import FormField from '$lib/components/FormField.svelte';
	import { syncService } from '$lib/services/syncService';

	let truckRegistration = '';
	let materialType = 'Reverts';
	let sampleId = '';
	let loadingLocation = 'Unrefined Copper';
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
				processLayout.setError('Truck has already been registered');
				return;
			}

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
				materialType: materialType,
				linkedTruckIds: [newTruck?.serverId || newTruck?.id],
				syncStatus: 'pending',
				location: loadingLocation,
				created: new Date(),
				updated: new Date().toISOString(),
				process: 'Concentrator & Smelter',
				sampleId: sampleId,
				siteLocation: 'PMC',
			};

			await indexedDBService.saveRecord('assays', assay);
			await syncService.syncAssay(assay);

			goto(`/pmc/processes/concentrator-&-smelter/unrefined-copper/sampling/verification?sampleId=${encodeURIComponent(sampleId)}&truckRegistration=${encodeURIComponent(truckRegistration)}`)
		} catch (err) {
			error = 'Failed to submit data';
			console.error(err);
		}
	}
	let currentStep = 1;
	function handleCancel() {
		goto('/pmc/processes/concentrator-&-smelter/unrefined-copper');
	}
</script>
<ProcessLayout
  title="Copper Concentrate"
  {steps}
  {currentStep}
  isSubmitting={false}
  bind:this={processLayout}
  cancelPath="/pmc/processes/concentrator-&-smelter/unrefined-copper"
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

	<h2 class='header'>Truck Details Capturing</h2>
	<span class='note' style="margin-top: -0.2rem; display: block; font-size: 12px;">Please note that every truck has to be sampled</span>

	<div>
		<div class='form-field'>	
			<FormField
				id="truckRegistration"
				label="Enter the Truck Registration"
				type="text"
				bind:value={truckRegistration}
				placeholder="Enter Truck Registration"
				required
			/>
		</div>
		<div class='form-field'>
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
		</div>
		<div class='form-field'>
			<FormField
				id="sampleId"
				label="Sample ID"
				type="text"
				bind:value={sampleId}
				placeholder="Enter Sample ID"
				required
			/>
		</div>
	</div>
</ProcessLayout>

<style>
	.form-field {
		width: 100%;
		margin-bottom: 1.5rem;
	}
	
	.header {
		font-size: 1.3rem;
		font-weight: bold;
		margin-bottom: 0.5rem;
		color: #333;
	}
</style>