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
	const processSteps = ['Sample Details', 'FEL Weight Capturing', 'Complete'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	function handleCancel() {
		goto('/bosveld/processes');
	}
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
				created: new Date(),
				updated: new Date().toISOString(),
				linkedWagonIds: [],
				linkedTruckIds: [],
				syncStatus: 'pending',
				process: 'West Loadout',
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
				goto('/bosveld/processes/west-loadout/verification?sampleId=' + assay.id);
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
	title="Sample Details"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/bosveld/processes"
	bind:this={processLayout}
	on:submit={handleSubmit}
	on:cancel={handleCancel}
>
	<div slot="header">
		<h5 class="text-xl font-bold ">Sample Details Capturing</h5>
		<p class="text-sm text-gay">Please enter the sample and product details</p>
	</div>

	<div class="container">
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
			label="Consignment Number (Optional)"
			bind:value={consignment}
			placeholder="Select Consignment"
			isSelect={true}
			options={consignments.map((con) => ({ value: con.name, label: con.name }))}
			error={formErrors.consignment}
		/>

		<FormField
			id="loadingLocation"
			label="Loading Location"
			disabled
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
</style>
