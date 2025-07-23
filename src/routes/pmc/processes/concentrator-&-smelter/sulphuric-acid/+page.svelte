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
				acidType: acidType,
				siteLocation: 'PMC',
			};

			// Create assay record
			const assay: Assay = {
				id: crypto.randomUUID(),
				name: sampleId || `ACID_${Date.now()}`,
				created: new Date(),
				syncStatus: 'pending',
				process: 'Acid Truck',
				productType: acidType,
				linkedTruckLoadIds: [truckLoadId],
				siteLocation: 'PMC',
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
				goto(`/pmc/processes/concentrator-&-smelter/sulphuric-acid/review?assayId=${assay.id}&truckLoadId=${truckLoadId}`);
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
		//showCamera = false;
	}

	function handleCancel() {
		goto('/pmc/processes/concentrator-&-smelter');
	}
</script>

<ProcessLayout
	title="Acid Truck Details"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/pmc/processes/concentrator-&-smelter"
	bind:this={processLayout}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
	<div slot="header">
		<h5 class="text-xl font-bold ">Acid Truck Loading Details</h5>
		<p class="text-sm text-gay">Please enter the truck and loading details</p>
	</div>

	<div class="container">
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
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
