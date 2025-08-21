<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { formPersistenceService } from '$lib/services/formPersistenceService';
	import { page } from '$app/stores';

	let availableWagons: any[] = [];
	let selectedWagon = '';
	let shuntingTrainVerificationDate = $page.url.searchParams.get('shuntingTrainVerificationDate');

	let felWeight = '';
	let loadingLocation = 'Bosveld';
	let isSubmitting = false;
	let currentStep = 2;

	// Process steps
	const processSteps = ['Shunting Train', 'Wagon FEL Operations', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	function handleCancel() {
		goto('/bosveld/processes/loading-station/fel-operations');
	}
	// Form errors
	let formErrors = {
		selectedWagon: '',
		felWeight: '',
	};

	const loadingLocations = ['East Load Out', 'West Load Out', 'Bosveld'];

	onMount(async () => {
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
	let existingIdsArray: string[] = [];
	$: existingIdsArray = ($page.url.searchParams.get('wagonIds') || '').split(',').filter(Boolean);

	onMount(async () => {
		if (!shuntingTrainVerificationDate) {
			processLayout.setError('Shunting Train Verification Date is required.');
			return;
		}
		let shuntingTrain = (await indexedDBService.getAllRecords('shuntingTrains')).find(t => t.verificationTimestamp === shuntingTrainVerificationDate);

		const linkedWagons = shuntingTrain?.linkedWagons || [];

		let allwagons = (await indexedDBService.getAllRecords('wagons')).filter(
			wagon => wagon.dispatchTimestamp && !wagon.felTimestamp
		);
		
		availableWagons = allwagons.filter(
			wagon => linkedWagons.some(linkedWagon => linkedWagon === wagon.id)
		);
	});

	async function handleSubmit() {
		if (!validateForm()) {
			return;
		}

		try {
			isSubmitting = true;
			processLayout.setError('');
			processLayout.setSuccess('');

			if (selectedWagon) {
				let wagon = (await indexedDBService.getAllRecords('wagons')).find(
					(w) => w.wagonId === selectedWagon
				);

				if (!wagon) {
					processLayout.setError('Wagon not found');
					return;
				}

				await indexedDBService.updateRecord('wagons', wagon.id, {
					felWeight: Number(felWeight),
					felTimestamp: new Date(),
					syncStatus: 'pending',
					updated: new Date().toISOString()
				});

				// Clear persisted form data
				formPersistenceService.clearForm('loading_station');

				processLayout.setSuccess('Data saved successfully');
				setTimeout(() => {
					goto(
						`/bosveld/processes/loading-station/fel-operations/wagons/review?wagonId=${encodeURIComponent(selectedWagon)}&shuntingTrainVerificationDate=${shuntingTrainVerificationDate}`
					);
				}, 1000);
			}
			// Clear persisted form data
			formPersistenceService.clearForm('loading_station');
		} catch (err) {
			processLayout.setError('Failed to save assay data');
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
	cancelPath="/bosveld/processes/loading-station/fel-operations"
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
			label="Wagon ID"
			search={true}
			options={availableWagons.map(wagon => ({value: wagon.wagonId, label: wagon.wagonId}))}
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
