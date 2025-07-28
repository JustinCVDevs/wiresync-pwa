<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { formPersistenceService } from '$lib/services/formPersistenceService';

	let availableWagons: any[] = [];
	let selectedWagon: any = null;

	let wagonId = '';
	let felWeight = '';
	let loadingLocation = 'West Load Out';
	let isSubmitting = false;
	let currentStep = 1;

	// Process steps
	const processSteps = ['FEL Weight Capturing', 'Complete'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	function handleCancel() {
		goto('/pmc/processes');
	}
	// Form errors
	let formErrors = {
		sampleId: '',
		productGrade: '',
		wagonId: '',
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
				formPersistenceService.saveForm('west_loadout', {
					loadingLocation
				});
			}
		};
	});

	function loadPersistedData() {
		const savedData = formPersistenceService.loadForm<{
			loadingLocation: string;
		}>('west_loadout');

		if (savedData) {
			loadingLocation = savedData.loadingLocation || 'West Load Out';
		}
	}

	function validateForm() {
		let isValid = true;
		formErrors = {
			sampleId: '',
			productGrade: '',
			wagonId: '',
			felWeight: '',
		};

		if (!wagonId) {
			formErrors.sampleId = 'Wagon ID is required';
			isValid = false;
		}

		if (!felWeight || isNaN(Number(felWeight)) || Number(felWeight) <= 0) {
			formErrors.productGrade = 'FEL Weight is required';
			isValid = false;
		}


		return isValid;
	}

	// Fetch all wagons from IndexedDB that just got scanned in from sampling
	async function getWagons() {
		try {
			const wagons = (await indexedDBService.getAllRecords('wagons')).filter((w) => {
				return (
					w.loadingLocation === 'West Load Out'
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
			return;
		}

		try {
			isSubmitting = true;
			processLayout.setError('');
			processLayout.setSuccess('');

			if (selectedWagon) {
				selectedWagon.loadingLocation = loadingLocation;
				selectedWagon.felWeight = felWeight;
				selectedWagon.syncStatus = 'pending';
				selectedWagon.updated = new Date().toISOString();

				await indexedDBService.updateRecord('wagons', selectedWagon.id, selectedWagon);
			}

			// Clear persisted form data
			formPersistenceService.clearForm('west_loadout');

			processLayout.setSuccess('Data saved successfully');
			setTimeout(() => {
				// Navigate to verification page
				goto(`/pmc/processes/magnetite-rail/west-load-out/fel-operations/verification?wagonId=${encodeURIComponent(wagonId)}`);
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
	title="Wagon Details"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	bind:this={processLayout}
	cancelPath="/pmc/processes"
	on:submit={handleSubmit}
	on:cancel={handleCancel}
>
	<div slot="header">
		<h5 class="text-xl font-bold ">Wagon Details Capturing</h5>
		<p class="text-sm text-gay">Please enter the wagon details</p>
	</div>

<div class="container">
	<div>
		<FormField
			id="wagonId"
			label="Wagon ID"
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
