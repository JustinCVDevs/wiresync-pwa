<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { formPersistenceService } from '$lib/services/formPersistenceService';
	import type { Assay } from '$lib/types/assay';
	import { syncService } from '$lib/services/syncService';
	import { page } from '$app/stores';
	import QRPrinting from '$lib/components/QRPrinting.svelte';

	let sampleId = '';
	let trainNumber = '';
	let wagonIdSimple = $page.url.searchParams.get('wagonIdSimple') || '';
	let shuntingTrainVerificationDate = $page.url.searchParams.get('shuntingTrainVerificationDate');
	let productGrade = localStorage.getItem('productGrade') || '';
	let loadingLocation = 'East Load Out';
	let isSubmitting = false;
	let currentStep = 2;

	let selectedWagon = '';
	let availableWagons: any[] = [];

	// Process steps
	const processSteps = ['Arrival Train', 'Wagon Sampling', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	function formatTimestamp(date: Date) {
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		const dd = String(date.getDate()).padStart(2, '0');
		const hh = String(date.getHours()).padStart(2, '0');
		const min = String(date.getMinutes()).padStart(2, '0');
		return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
	}

	function handleCancel() {
		goto('/pmc/processes/magnetite-rail/east-load-out/sampling');
	}
	// Form errors
	let formErrors = {
		sampleId: '',
		productGrade: '',
		selectedWagon: '',
		trainNumber: ''
	};

	async function fetchData() {
		// Only fetch data if wagonIdSimple is provided and not empty
		if (!wagonIdSimple) return;
		
		const wagon = (await indexedDBService.getAllRecords('wagons')).find(
			(w) => w.wagonIdSimple === wagonIdSimple
		);

		if (wagon) {
			selectedWagon = wagon.wagonIdSimple || '';
			productGrade = wagon.productType || '';
			trainNumber = wagon.trainNumber || '';
			sampleId = wagon.sampleId || '';
		}
	}

	$: if (wagonIdSimple === '') {
		const currentDate = new Date();
		const YYMMDD = `${currentDate.getFullYear().toString().slice(-2)}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;

		const productCode = {
			'Iron Oxide': 'IOX',
			'Magnetite-DMS': 'DMS',
			'Magnetite 62%': 'MAG62',
			'Magnetite 65%': 'MAG65'
		}[productGrade];

		sampleId = `${YYMMDD}${selectedWagon ? `_${selectedWagon}` : ''}${trainNumber ? `_${trainNumber}` : ''}${productCode ? `_${productCode}` : ''}`;
	} else {
		fetchData();
	}

	const productGrades = ['Iron Oxide', 'Magnetite-DMS', 'Magnetite 62%', 'Magnetite 65%'];

	const loadingLocations = ['East Load Out', 'West Load Out', 'Bosveld'];

	// Save form data when component is unmounted
	onMount(() => {
		loadPersistedData();
		return () => {
			if (sampleId || productGrade) {
				formPersistenceService.saveForm('east_loadout', {
					productGrade,
					loadingLocation
				});
			}
		};
	});

	function validateForm() {
		let isValid = true;
		formErrors = {
			sampleId: '',
			productGrade: '',
			selectedWagon: '',
			trainNumber: ''
		};

		if (!sampleId) {
			formErrors.sampleId = 'Sample ID is required';
			isValid = false;
		}

		if (!productGrade) {
			formErrors.productGrade = 'Product grade is required';
			isValid = false;
		}

		if (!selectedWagon) {
			formErrors.selectedWagon = 'Wagon ID is required';
			isValid = false;
		}

		if (!trainNumber) {
			formErrors.trainNumber = 'Train number is required';
			isValid = false;
		}

		return isValid;
	}

	let existingIdsArray: string[] = [];
	$: existingIdsArray = ($page.url.searchParams.get('wagonIdSimple') || '').split(',').filter(Boolean);

	onMount(async () => {
		let shuntingTrain = (await indexedDBService.getAllRecords('shuntingTrains')).find(t => t.verificationTimestamp === shuntingTrainVerificationDate);

		const linkedWagons = shuntingTrain?.linkedWagons || [];
		
		let allwagons = (await indexedDBService.getAllRecords('wagons')).filter(
			wagon => linkedWagons.some(linkedWagon => linkedWagon === wagon.id)
		);
		
		availableWagons = allwagons.filter(
			wagon => !wagon.sampleTimestamp
		);
	});

	function loadPersistedData() {
		const savedData = formPersistenceService.loadForm<{
			loadingLocation: string;
		}>('east_loadout');

		if (savedData) {
			loadingLocation = savedData.loadingLocation || 'East Load Out';
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
				let wagon = (await indexedDBService.getAllRecords('wagons')).find(
					(w) => w.wagonIdSimple === selectedWagon
				);

				if (!wagon) {
					processLayout.setError('Wagon not found');
					return;
				}

				wagon.productType = productGrade;
				wagon.trainNumber = trainNumber;
				wagon.loadingLocation = loadingLocation;
				wagon.sampleId = sampleId;
				wagon.syncStatus = 'pending';
				wagon.sampleTimestamp = new Date();
				wagon.updated = formatTimestamp(new Date());

				await indexedDBService.updateRecord('wagons', wagon.id, wagon);

				// Create the assay object according to the Assay interface
				const assay: Assay = {
					id: crypto.randomUUID(),
					name: sampleId,
					sampleId: sampleId,
					productType: productGrade,
					location: loadingLocation,
					created: new Date(),
					updated: new Date().toISOString(),
					linkedWagonIds: [wagon?.serverId || ''],
					syncStatus: 'pending',
					siteLocation: 'PMC',
				};

				// Save to IndexedDB
				await indexedDBService.saveRecord('assays', assay);

				// Try to sync using the sync service
				await syncService.syncAssay(assay);

				// Clear persisted form data
				formPersistenceService.clearForm('east_loadout');

				processLayout.setSuccess('Data saved successfully');
				setTimeout(() => {
					goto(
						`/pmc/processes/magnetite-rail/east-load-out/sampling/wagons/review?wagonIdSimple=${encodeURIComponent(selectedWagon)}&shuntingTrainVerificationDate=${shuntingTrainVerificationDate}`
					);
				}, 1000);
			}
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
	bind:this={processLayout}
	cancelPath="/pmc/processes/magnetite-rail/east-load-out/sampling"
	on:submit={handleSubmit}
	on:cancel={handleCancel}
>
	<div slot="header">
		<h5 class="text-xl font-bold ">Sample Details Capturing</h5>
		<p class="text-sm text-gay">Please enter the sample and product details</p>
	</div>

<div class="container">
	<div class="form">
		{#if wagonIdSimple === ''}
			<FormField
				id="wagonId"
				label="Wagon ID"
				search={true}
				options={availableWagons.map(wagon => ({value: wagon.wagonIdSimple, label: wagon.wagonIdSimple}))}
				bind:value={selectedWagon}
				placeholder="Select Wagon ID"
				required
			/>
		{:else}
			<FormField
				id="wagonId"
				label="Wagon ID"
				bind:value={selectedWagon}
				placeholder="Enter Wagon ID"
				required
			/>
		{/if}
	</div>	
	<div class="form">
		<FormField
			id="productGrade"
			label="Product Selection"
			bind:value={productGrade}
			placeholder="Select Product Grade"
			isSelect={true}
			options={productGrades.map((grade) => ({ value: grade, label: grade }))}
			required={true}
			error={formErrors.productGrade}
		/>
	</div>	
	<div class="form">	
		<FormField 
			id="trainNumber"
			label="Train Number"
			bind:value={trainNumber}
			required={true}
			placeholder="Enter Train Number"
			error={formErrors.trainNumber}
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
	<div class="form">	
		<FormField
			id="sampleId"
			label="Sample ID"
			bind:value={sampleId}
			placeholder="Enter Sample ID"
			required={true}
			error={formErrors.sampleId}
		/>
	</div>
</div>
<QRPrinting {sampleId}/>
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
