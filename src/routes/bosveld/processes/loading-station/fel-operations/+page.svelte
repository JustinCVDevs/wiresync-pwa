<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { formPersistenceService } from '$lib/services/formPersistenceService';

	let availableWagons: any[] = [];
	let selectedWagon = '';

	let felWeight = '';
	let loadingLocation = 'Bosveld';
	let isSubmitting = false;
	let currentStep = 1;

	// Process steps
	const processSteps = ['FEL Weight Capturing', 'Complete'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	function handleCancel() {
		goto('/bosveld/processes/loading-station');
	}
	// Form errors
	let formErrors = {
		selectedWagon: '',
		felWeight: '',
	};

	const loadingLocations = ['East Load Out', 'West Load Out', 'Bosveld'];

	onMount(async () => {
		availableWagons = await getWagons();

		loadPersistedData();
	});

	// Save form data when component is unmounted
	onMount(() => {
		return () => {
			if (loadingLocation) {
				formPersistenceService.saveForm('loading_station', {
					loadingLocation
				});
			}
		};
	});

	function loadPersistedData() {
		const savedData = formPersistenceService.loadForm<{
			loadingLocation: string;
		}>('loading_station');

		if (savedData) {
			loadingLocation = savedData.loadingLocation || 'Bosveld';
		}
	}

	function validateForm() {
		let isValid = true;
		formErrors = {
			selectedWagon: '',
			felWeight: '',
		};

		if (!selectedWagon) {
			formErrors.selectedWagon = 'Wagon ID is required';
			isValid = false;
		}

		if (!felWeight || isNaN(Number(felWeight)) || Number(felWeight) <= 0) {
			formErrors.felWeight = 'FEL Weight is required';
			isValid = false;
		}
		return isValid;
	}

	// Fetch all wagons from IndexedDB that just got scanned in from sampling
	async function getWagons() {
		try {
			const wagons = (await indexedDBService.getAllRecords('wagons')).filter((w) => {
				return (
					w.loadingLocation === 'Bosveld' && w.felWeight === 0
				);
			});

			return wagons;
		} catch (error) {
			console.error('No wagons available', error);
			return [];
		}
	}

	async function handleSubmit() {
		if (!validateForm()) {
			console.error('Form validation failed', formErrors);
			return;
		}

		try {
			isSubmitting = true;
			processLayout.setError('');
			processLayout.setSuccess('');

			if (selectedWagon) {
				const wagon = (await indexedDBService.getAllRecords('wagons')).find(
					w => w.sampleId === selectedWagon
				);

				if (!wagon) {
					processLayout.setError('Wagon not found');
					return;
				}

				wagon.loadingLocation = loadingLocation;
				wagon.felWeight = Number(felWeight);
				wagon.syncStatus = 'pending';
				wagon.updated = new Date().toISOString();

				await indexedDBService.updateRecord('wagons', wagon.id, wagon);

				processLayout.setSuccess('Data saved successfully');
				setTimeout(() => {
					// Navigate to verification page
					goto(`/bosveld/processes/loading-station/fel-operations/verification?wagonId=${encodeURIComponent(wagon.wagonId || '')}`);
				}, 1000);
			}
			// Clear persisted form data
			formPersistenceService.clearForm('loading_station');
		} catch (err) {
			processLayout.setError('Failed to save wagon data');
			console.error(err);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<ProcessLayout
	title="Wagon Details"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	bind:this={processLayout}
	cancelPath="/bosveld/processes/loading-station"
	on:submit={handleSubmit}
	on:cancel={handleCancel}
>
	<div slot="header">
		<h5 class="text-xl font-bold ">Wagon Details Capturing</h5>
		<p class="text-sm text-gay">Please enter the wagon details</p>
	</div>

<div class="container">
	<div class="form">
		<FormField
			id="wagonId"
			label="Please select Wagon ID"
			search={true}
			options={availableWagons.map(wagon => ({value: wagon.sampleId, label: wagon.wagonId}))}
			bind:value={selectedWagon}
			placeholder="Select Wagon ID"
			required
		/>
	</div>

	<div class="form">
		<FormField 
			id="felWeight"
			label="FEL Weight (Tons)"
			type="number"
			step="0.01"
			bind:value={felWeight}
			placeholder="Enter FEL Weight"
			required={true}
			error={formErrors.felWeight}
		/>
	</div>	

	<div class="form">	
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
</div>
</ProcessLayout>

<style>
	.container {
		max-width: 600px;
		margin: 0 auto;
	}
	.form {
		margin-top: 1rem;
		position: relative;
	}
</style>
