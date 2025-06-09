<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { formPersistenceService } from '$lib/services/formPersistenceService';
	import type { Assay } from '$lib/types/assay';
	import { syncService } from '$lib/services/syncService';
	import { SamplingStatusEnum } from '$lib/types/enums';
	import type { ID } from '$lib';
	import moment from 'moment';

	let samplingStatus: SamplingStatusEnum = SamplingStatusEnum.No;
	let wagonId: ID = '';
	let sampleId = '';
	let productGrade = '';
	let isSubmitting = false;
	let currentStep = 1;

	// Process steps
	const steps = ['Sample Details', 'FEL Weight Capturing', 'Complete'];

	const samplingStatusOptions = [
		{ value: SamplingStatusEnum.Yes, label: 'Yes' },
		{ value: SamplingStatusEnum.No, label: 'No' }
	];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	// Form errors
	let formErrors = {
		sampleId: '',
		productGrade: ''
	};

	onMount( async () => {
		// Load persisted form data
		loadPersistedData();
	});

	// Save form data when component is unmounted
	onMount(() => {
		return () => {
			if (sampleId || productGrade) {
				formPersistenceService.saveForm('east_loadout', {
					sampleId,
					productGrade,
					wagonId,
					samplingStatus
				});
			}
		};
	});

	function loadPersistedData() {
		const savedData = formPersistenceService.loadForm<{
			sampleId: string;
			productGrade: string;
		}>('east_loadout');

		if (savedData) {
			sampleId = savedData.sampleId || '';
			productGrade = savedData.productGrade || '';
		}
	}


	function validateForm() {
		let isValid = true;
		formErrors = {
			sampleId: '',
			productGrade: '',
			wagonId: '',
			samplingStatus: ''
		};

		if (!sampleId) {
			formErrors.sampleId = 'Sample ID is required';
			isValid = false;
		}

		if (!productGrade) {
			formErrors.productGrade = 'Product grade is required';
			isValid = false;
		}

		return isValid;
	}

	const productGrades = ['Iron Oxide', 'Magnetite', 'Mag-64', 'Mag-65'];

	async function handleSubmit() {
		if (!validateForm()) {
			return;
		}

		try {
			isSubmitting = true;
			processLayout.setError('');
			processLayout.setSuccess('');

			// Create the assay object according to the Assay interface
			const assay: Assay = {
				id: crypto.randomUUID(),
				name:  sampleId,
				productGrade: productGrade,
				location: 'East Load Out',
				created: new Date().toISOString(),
				updated: new Date().toISOString(),
				linkedWagonIds: [],
				linkedTruckIds: [],
				syncStatus: 'pending',
				process: 'East Loadout'
			};

			// Save to IndexedDB
			await indexedDBService.saveRecord('assays', assay);

			// Try to sync using the sync service
			await syncService.syncAssay(assay);

			// Store wagon linkage
			assay.linkedWagonIds.push(wagonId);
			await indexedDBService.saveRecord('assays', assay);

			// Clear persisted form data
			formPersistenceService.clearForm('east_loadout');

			processLayout.setSuccess('Data saved successfully');
			currentStep++;
			setTimeout(() => {
				// Navigate to next step
					goto('/pmc/processes/east-loadout/verification?sampleId=' + assay.id);
			}, 1000);
		} catch (err) {
			if (currentStep < 4) {
				currentStep++;
			} else {
				processLayout.setError('Failed to save assay data');
			}
			console.error(err);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<ProcessLayout
	title="East Loadout"
	{steps}
	{currentStep}
	{isSubmitting}
	bind:this={processLayout}
	on:submit={handleSubmit}
>
	<div slot="header">
		<h5 class="text-xl font-bold ">Sample Details</h5>
		<p class="text-sm text-gay">Please enter the sample and product details</p>
	</div>

	<div class="space-y-4">
		{#if currentStep === 1}
			<FormField
				id="sampleId"
				label="Sample ID"
				bind:value={sampleId}
				placeholder="Enter Sample ID"
				required={true}
				error={formErrors.sampleId}
			/>

			<FormField
				id="productGrade"
				label="Product Grade"
				bind:value={productGrade}
				placeholder="Select Product Grade"
				isSelect={true}
				options={productGrades.map((grade) => ({ value: grade, label: grade }))}
				required={true}
				error={formErrors.productGrade}
			/>
		{/if}

		{#if currentStep === 3}
			<FormField
				id="wagonId"
				label="Wagon ID"
				bind:value={wagonId}
				placeholder="Scan RFID or enter manually"
				required={true}
				error={formErrors.wagonId}
			/>

			<FormField
				id="samplingStatus"
				label="Sampling Completed"
				bind:value={samplingStatus}
				isSelect={true}
				options={samplingStatusOptions}
				required={true}
				error={formErrors.samplingStatus}
			/>
		{/if}
	</div>
</ProcessLayout>

<style>
	.container {
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem;
	}

	.form {
		margin-top: 2rem;
	}

	.input-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: bold;
	}

	input,
	select {
		width: 100%;
		padding: 0.75rem;
		font-size: 1.1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	.button-group {
		display: flex;
		gap: 1rem;
		margin-top: 2rem;
	}

	button {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		color: white;
	}

	.submit-button {
		background-color: #4caf50;
	}

	.cancel-button {
		background-color: #f44336;
	}

	.error {
		background-color: #ffebee;
		color: #c62828;
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}
</style>
