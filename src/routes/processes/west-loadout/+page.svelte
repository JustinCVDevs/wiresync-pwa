<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { formPersistenceService } from '$lib/services/formPersistenceService';
	import type { Assay } from '$lib/types/assay';
	import { pocketbaseService } from '$lib/services/pocketbaseService';
	import { syncService } from '$lib/services/syncService';

	interface Consignment {
		name: string;
	}

	let sampleId = '';
	let productGrade = '';
	let consignment = '';
	let loadingLocation = 'West Load Out';
	let consignments: Consignment[] = [];
	let isSubmitting = false;
	let currentStep = 1;

	// Process steps
	const processSteps = ['Train Details', 'Sample Details Verification', 'FEL Weight Capturing', 'Wagon Review'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	// Form errors
	let formErrors = {
		sampleId: '',
		productGrade: '',
		consignment: ''
	};

	const productGrades = ['Iron Oxide', 'Magnetite', 'Mag-64', 'Mag-65'];

	const loadingLocations = ['East Load Out', 'West Load Out', 'Bosveld'];

	onMount(async () => {
		consignments = await indexedDBService.getRecords(
			  'consignments', )

		// Load persisted form data
		loadPersistedData();
	});

	// Save form data when component is unmounted
	onMount(() => {
		return () => {
			if (sampleId || productGrade || consignment) {
				formPersistenceService.saveForm('west_loadout', {
					sampleId,
					productGrade,
					consignment,
					loadingLocation
				});
			}
		};
	});

	function loadPersistedData() {
		const savedData = formPersistenceService.loadForm<{
			sampleId: string;
			productGrade: string;
			consignment: string;
			loadingLocation: string;
		}>('west_loadout');

		if (savedData) {
			sampleId = savedData.sampleId || '';
			productGrade = savedData.productGrade || '';
			consignment = savedData.consignment || '';
			loadingLocation = savedData.loadingLocation || 'West Load Out';
		}
	}

	function validateForm() {
		let isValid = true;
		formErrors = {
			sampleId: '',
			productGrade: '',
			consignment: ''
		};

		if (!sampleId) {
			formErrors.sampleId = 'Sample ID is required';
			isValid = false;
		}

		if (!productGrade) {
			formErrors.productGrade = 'Product grade is required';
			isValid = false;
		}

		if (!consignment) {
			formErrors.consignment = 'Consignment is required';
			isValid = false;
		}

		return isValid;
	}

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
				name: sampleId,
				productGrade: productGrade,
				location: loadingLocation,
				created: new Date().toISOString(),
				updated: new Date().toISOString(),
				linkedWagonIds: [],
				linkedTruckIds: [],
				syncStatus: 'pending',
				process: 'West Loadout',
				consignment: consignment
			};

			// Save to IndexedDB
			await indexedDBService.saveRecord('assays', assay);

			// Try to sync using the sync service
			await syncService.syncAssay(assay);

			// Clear persisted form data
			formPersistenceService.clearForm('west_loadout');

			processLayout.setSuccess('Data saved successfully');
			setTimeout(() => {
				// Navigate to verification page
				goto('/processes/west-loadout/verification?sampleId=' + assay.id);
			}, 1000);
		} catch (err) {
			processLayout.setError('Failed to save assay data');
			console.error(err);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<ProcessLayout
	title="West Loadout - Train Details"
	processKey="west_loadout"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	bind:this={processLayout}
	on:submit={handleSubmit}
>
	<div slot="header">
		<h5 class="text-xl font-bold ">Train Loading Details</h5>
		<p class="text-sm text-gray-600">Please enter the sample and product details</p>
	</div>

	<div class="space-y-4">
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

		<FormField
			id="consignment"
			label="Consignment Number"
			bind:value={consignment}
			placeholder="Select Consignment"
			isSelect={true}
			options={consignments.map((con) => ({ value: con.name, label: con.name }))}
			required={true}
			error={formErrors.consignment}
		/>

		<FormField
			id="loadingLocation"
			label="Loading Location"
			bind:value={loadingLocation}
			placeholder="Select Loading Location"
			isSelect={true}
			options={loadingLocations.map((location) => ({ value: location, label: location }))}
			required={true}
		/>
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
