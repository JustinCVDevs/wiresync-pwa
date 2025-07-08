<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Camera from '$lib/components/Camera.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { formPersistenceService } from '$lib/services/formPersistenceService';
	import type { TruckArrival } from '$lib/types/truckArrival';
	import type { Truck } from '$lib/types/truck';

	let truckRegistration = '';
	let portArrivalSampleId = '';
	let capturedPhoto: File | null = null;
	let photoBase64 = '';
	let availableTrucks: Truck[] = [];
	let isSubmitting = false;
	let showCamera = true;
	let capturedImage: string | null = null;
	let currentStep = 1;

	// Process steps
	const processSteps = ['Truck Arrival Details', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	// Form errors
	let formErrors = {
		truckRegistration: '',
		portArrivalSampleId: '',
		capturedPhoto: ''
	};

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
			if (truckRegistration || portArrivalSampleId || capturedPhoto) {
				formPersistenceService.saveForm('truck_arrival', {
					truckRegistration,
					portArrivalSampleId,
					capturedPhoto: capturedPhoto ? URL.createObjectURL(capturedPhoto) : ''
				});
			}
		};
	});

	function loadPersistedData() {
		const savedData = formPersistenceService.loadForm<{
			truckRegistration: string;
			portArrivalSampleId: string;
			capturedPhoto: string;
		}>('truck_arrival');

		if (savedData) {
			truckRegistration = savedData.truckRegistration || '';
			portArrivalSampleId = savedData.portArrivalSampleId || '';
			// Note: capturedPhoto cannot be restored from URL
		}
	}

	function validateForm() {
		let isValid = true;
		formErrors = {
			truckRegistration: '',
			portArrivalSampleId: '',
			capturedPhoto: ''
		};

		if (!truckRegistration) {
			formErrors.truckRegistration = 'Truck registration is required';
			isValid = false;
		}

		if (!portArrivalSampleId) {
			formErrors.portArrivalSampleId = 'Port arrival sample ID is required';
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

			if (capturedPhoto) {
				photoBase64 = await new Promise<string>((resolve) => {
					const reader = new FileReader();
					reader.onloadend = () => resolve(reader.result as string);
					if (capturedPhoto) reader.readAsDataURL(capturedPhoto);
				});
				// Store photo in session storage for verification page
				sessionStorage.setItem('trainArrivalPhoto', photoBase64);
			}

			// Clear persisted form data
			formPersistenceService.clearForm('truck_arrival');

			// Navigate to verification page with data
			const params = new URLSearchParams({
				truckRegistration,
				portArrivalSampleId
			});
			
			goto(`/richardsbay/processes/truck-arrival/verification?${params.toString()}`);
		} catch (err) {
			processLayout.setError('Failed to proceed to verification');
			console.error(err);
		} finally {
			isSubmitting = false;
		}
	}

	function handlePhotoSelected(file: File) {
		capturedImage = URL.createObjectURL(file);
		showCamera = false;
		// Clear photo error if photo is selected
		if (formErrors.capturedPhoto) {
			formErrors.capturedPhoto = '';
		}
	}

	function handleCancel() {
		goto('/richardsbay/processes');
	}

	$: isFormValid = truckRegistration && portArrivalSampleId && capturedPhoto;
</script>

<ProcessLayout
	title="Truck Arrival"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/richardsbay/processes"
	bind:this={processLayout}
	on:submit={handleSubmit}
	on:cancel={handleCancel}
>
	<div slot="header">
		<h5 class="text-xl font-bold text-gray">Truck Arrival</h5>
		<p class="text-sm text-gray-600">
			Please enter the Truck Registration
		</p>
	</div>

	<div class="space-y-4">
		<!-- Truck Registration Input -->
		<FormField
			id="truckRegistration"
			label="Truck Registration"
			bind:value={truckRegistration}
			placeholder="Enter truck registration"
			required={true}
			error={formErrors.truckRegistration}
		/>

		<!-- Port Arrival Sample ID Input -->
		<FormField
			id="portArrivalSampleId"
			label="Please enter Sample ID"
			bind:value={portArrivalSampleId}
			placeholder="Enter sample ID"
			required={true}
			error={formErrors.portArrivalSampleId}
		/>

		<!-- Camera Section -->
		<div class="space-y-2">
			<span class="block text-sm font-medium text-gray-700">
				Capture a photo of the Truck Registration
			</span>
			{#if showCamera}
				<Camera onPhotoSelected={handlePhotoSelected} initialFile={capturedPhoto} />
			{/if}
			{#if capturedImage}
				<!-- svelte-ignore a11y_img_redundant_alt -->
				<img src={capturedImage} alt="Captured photo" class="mt-4 rounded shadow max-w-xs" />
			{/if}
			{#if formErrors.capturedPhoto}
				<p class="text-sm text-red-600">{formErrors.capturedPhoto}</p>
			{/if}
		</div>
	</div>
</ProcessLayout>

<style>
	.space-y-2 > * + * {
		margin-top: 0.5rem;
	}
</style>