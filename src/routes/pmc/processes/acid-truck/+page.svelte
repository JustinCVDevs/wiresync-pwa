<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Camera from '$lib/components/Camera.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { formPersistenceService } from '$lib/services/formPersistenceService';

	import type { Assay } from '$lib/types/assay';
	import type { TruckLoad } from '$lib/types/truckLoad';

	let truckServerId = '';
	let availableTrucks: { id: string; registration: string }[] = [];
	let tankLocation = '';
	let acidType = '';
	let sampleId = '';
	let capturedImage = '';
	let isSubmitting = false;
	let currentStep = 1;

	// Process steps
	const processSteps = ['Truck Details', 'Review'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	// Form errors
	let formErrors = {
		truckServerId: '',
		tankLocation: '',
		acidType: ''
	};

	const tankLocations = ['Tank 1', 'Tank 2', 'Tank 3', 'Tank 4'];
	const acidTypes = ['Weak Acid', 'Strong Acid'];

	onMount(async () => {
		// Fetch trucks from IndexedDB
		const trucks = await indexedDBService.getRecords('trucks');
		availableTrucks = trucks;

		// Load persisted form data
		loadPersistedData();
	});

	// Save form data when component is unmounted
	onMount(() => {
		return async () => {
			if (truckServerId || tankLocation || acidType || sampleId || capturedImage) {
				formPersistenceService.saveForm('acid_truck', {
					truckServerId,
					tankLocation,
					acidType,
					sampleId,
					capturedImage
				});
			}
		};
	});

	function loadPersistedData() {
		const savedData = formPersistenceService.loadForm<{
			truckServerId: string;
			tankLocation: string;
			acidType: string;
			sampleId: string;
			capturedImage: string;
		}>('acid_truck');

		if (savedData) {
			truckServerId = savedData.truckServerId || '';
			tankLocation = savedData.tankLocation || '';
			acidType = savedData.acidType || '';
			sampleId = savedData.sampleId || '';
			capturedImage = savedData.capturedImage || '';
		}
	}

	function validateForm() {
		let isValid = true;
		formErrors = {
			truckServerId: '',
			tankLocation: '',
			acidType: ''
		};

		if (!truckServerId) {
			formErrors.truckServerId = 'Truck is required';
			isValid = false;
		}

		if (!tankLocation) {
			formErrors.tankLocation = 'Tank location is required';
			isValid = false;
		}

		if (!acidType) {
			formErrors.acidType = 'Acid type is required';
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

			const truckLoadId = crypto.randomUUID();

			// Create truck load record
			const truckLoad: TruckLoad = {
				id: truckLoadId,
				truckId: truckServerId,
				sampleId: sampleId || `ACID_${Date.now()}`,
				created: new Date(),
				samplingStatus: true,
				syncStatus: 'pending',
				process: 'Acid Truck',
				loadingLocation: tankLocation,
				acidType: acidType
			};

			// Create assay record
			const assay: Assay = {
				id: crypto.randomUUID(),
				name: sampleId || `ACID_${Date.now()}`,
				created: new Date().toISOString(),
				syncStatus: 'pending',
				process: 'Acid Truck',
				productType: acidType,
				linkedTruckLoadIds: [truckLoadId]
			};

			// Save both records
			await Promise.all([
				indexedDBService.saveRecord('truckLoads', truckLoad),
				indexedDBService.saveRecord('assays', assay)
			]);

			// Clear persisted form data
			formPersistenceService.clearForm('acid_truck');

			processLayout.setSuccess('Data saved successfully');
			setTimeout(() => {
				goto(`/pmc/processes/acid-truck/review?assayId=${assay.id}&truckLoadId=${truckLoadId}`);
			}, 1000);
		} catch (err) {
			processLayout.setError('Failed to submit data');
			console.error(err);
		} finally {
			isSubmitting = false;
		}
	}

	function handleCapture(event: CustomEvent<string>) {
		capturedImage = event.detail;
		showCamera = false;
	}

	function handleCancel() {
		goto('/pmc/processes');
	}
</script>

<ProcessLayout
	title="Acid Truck Details"
	processKey="acid_truck"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/pmc/processes"
	bind:this={processLayout}
	on:submit={handleSubmit}
>
	<div slot="header">
		<h5 class="text-xl font-bold ">Acid Truck Loading Details</h5>
		<p class="text-sm text-gay">Please enter the truck and loading details</p>
	</div>

	<div class="space-y-4">
		

			

		<FormField
			id="truckRegistration"
			label="Truck Registration"
			bind:value={truckServerId}
			placeholder="Select Truck Registration"
			isSelect={true}
			options={availableTrucks.map((truck) => ({ value: truck.id, label: truck.registration  }))}
			required={true}
			error={formErrors.tankLocation}
		/>
		<Camera onPhotoSelected={(file) => (capturedImage = file ? URL.createObjectURL(file) : '')} />

		<FormField
			id="tankLocation"
			label="Tank Location"
			bind:value={tankLocation}
			placeholder="Select Tank Location"
			isSelect={true}
			options={tankLocations.map((location) => ({ value: location, label: location }))}
			required={true}
			error={formErrors.tankLocation}
		/>

		<FormField
			id="acidType"
			label="Acid Type"
			bind:value={acidType}
			placeholder="Select Acid Type"
			isSelect={true}
			options={acidTypes.map((type) => ({ value: type, label: type }))}
			required={true}
			error={formErrors.acidType}
		/>

		<FormField
			id="sampleId"
			label="Sample ID (Optional)"
			bind:value={sampleId}
			placeholder="Enter Sample ID"
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

	.camera-button {
		background-color: #2196f3;
		margin-top: 0.5rem;
	}

	.submit-button {
		background-color: #4caf50;
	}

	.cancel-button {
		background-color: #f44336;
	}

	.captured-image {
		margin-top: 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		overflow: hidden;
	}

	.captured-image img {
		width: 100%;
		height: auto;
		display: block;
	}

	.error {
		background-color: #ffebee;
		color: #c62828;
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}
</style>
