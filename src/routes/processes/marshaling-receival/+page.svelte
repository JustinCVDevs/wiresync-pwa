<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Camera from '$lib/components/Camera.svelte';
	import RfidReader from '$lib/components/RFIDReader.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { formPersistenceService } from '$lib/services/formPersistenceService';
	import type { Wagon } from '$lib';
	import { Trash } from 'lucide-svelte';

	let transcoreTag = '';
	let wagonId = '';
	let selectedPhoto: File | null = null;
	let isSubmitting = false;
	let currentStep = 1;
	let formErrors = {
		transcoreTag: '',
		wagonId: ''
	};

	// Process steps
	const processSteps = ['RFID Tag Linking', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	onMount(() => {
		loadPersistedData();
	});

	// Save form data when component is unmounted
	

	function validateForm() {
		let isValid = true;
		formErrors = {
			transcoreTag: '',
			wagonId: ''
		};

		if (!transcoreTag) {
			formErrors.transcoreTag = 'RFID tag is required';
			isValid = false;
		}

		if (!wagonId) {
			formErrors.wagonId = 'Wagon ID is required';
			isValid = false;
		}

		return isValid;
	}

	async function handleSubmit() {
		if (!validateForm()) {
			return;
		}
		formPersistenceService.clearForm('marshaling_receival');

		try {
			isSubmitting = true;
			processLayout.setError('');
			processLayout.setSuccess('');

			const receivalData: Wagon = {
				transcoreTag,
				wagonIdSimple: wagonId,
				wagonPhotoUrl: selectedPhoto,
				created: new Date().toISOString(),
				componentType: 'MARSHALING_RECEIVAL',
				id: crypto.randomUUID(),
				updated: new Date().toISOString(),
				syncStatus: 'pending',
				process: 'Marshaling_Receival'
			};

			await indexedDBService.saveRecord('wagons', receivalData);

				goto(`/processes/marshaling-receival/verify?id=${receivalData.id}`);
		} catch (e) {
			processLayout.setError('Failed to save data. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}

	function loadPersistedData() {
		const savedData = formPersistenceService.loadForm<{
			transcoreTag: string;
			wagonId: string;
			capturedImage: string;
		}>('marshaling_receival');

		if (savedData) {
			transcoreTag = savedData.transcoreTag || '';
			wagonId = savedData.wagonId || '';
			if (savedData.capturedImage) {
				selectedPhoto = formPersistenceService.dataURLtoFile(
					savedData.capturedImage,
					'wagonPhoto.png'
				);
			}
		}

		// Also check the old storage key for backward compatibility
	
	}
</script>

<ProcessLayout
	title="Wagon Details"
	processKey="marshaling_receival"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	bind:this={processLayout}
	on:submit={handleSubmit}
>
	<div slot="header">
		<h5 class="text-xl font-bold  dark:text-gray-800 ">RFID Tag & Wagon Number</h5>
		<p class="text-sm text-gray-600">
			Please place the RFID tag on the wagon in the appropriate position
		</p>
	</div>

	<div class="space-y-4">
		<div class="space-y-1">
			<RfidReader
				onScan={(tagId) => (transcoreTag = tagId)}
				defaultValue={transcoreTag}
				targetFieldId={transcoreTag}
				label="Enter/scan the RFID tag:"
			/>
			{#if formErrors.transcoreTag}
				<p class="text-sm text-red-600">{formErrors.transcoreTag}</p>
			{/if}
		</div>

		<FormField
			id="wagonId"
			label="Enter Wagon ID/Number:"
			bind:value={wagonId}
			placeholder="Enter Wagon ID"
			required={true}
			error={formErrors.wagonId}
		/>

		<div class="space-y-1">
			<label for="camera" class="block font-medium text-gray-700 text-sm"
				>Capture a photo of the Wagon ID/Number:</label
			>
			<Camera initialFile={selectedPhoto} onPhotoSelected={(file) => (selectedPhoto = file)} />
		</div>
	</div>
</ProcessLayout>
