<script lang="ts">
	import { goto } from '$app/navigation';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { formPersistenceService } from '$lib/services/formPersistenceService';
	import type { Assay } from '$lib/types/assay';
	import type { Wagon } from '$lib/types/wagon';
	import { syncService } from '$lib/services/syncService';

	let sampleId = '';
	let wagonId = '';
	let trainNumber = '';
	let productGrade = '';
	let loadingLocation = 'West Load Out';
	let isSubmitting = false;
	let currentStep = 1;

	// Process steps
	const processSteps = ['Sample Details', 'Complete'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	function handleCancel() {
		goto('/pmc/processes/magnetite-rail/west-load-out');
	}
	// Form errors
	let formErrors = {
		sampleId: '',
		productGrade: '',
		wagonId: '',
		trainNumber: ''
	};

	$: {
		const currentDate = new Date();
		const YYMMDD = `${currentDate.getFullYear().toString().slice(-2)}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;

		const productCode = {
			'Iron Oxide': 'IOX',
			'Magnetite-DMS': 'DMS',
			'Magnetite 62%': 'MAG62',
			'Magnetite 65%': 'MAG65'
		}[productGrade];

		sampleId = `${YYMMDD}${wagonId ? `_${wagonId}` : ''}${trainNumber ? `_${trainNumber}` : ''}${productCode ? `_${productCode}` : ''}`;
	}

	const productGrades = ['Iron Oxide', 'Magnetite-DMS', 'Magnetite 62%', 'Magnetite 65%'];

	const loadingLocations = ['East Load Out', 'West Load Out', 'Bosveld'];

	function validateForm() {
		let isValid = true;
		formErrors = {
			sampleId: '',
			productGrade: '',
			wagonId: '',
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

		if (!wagonId) {
			formErrors.wagonId = 'Wagon ID is required';
			isValid = false;
		}

		if (!trainNumber) {
			formErrors.trainNumber = 'Train number is required';
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

			let wagons = await indexedDBService.getAllRecords('wagons');
			// Check if the wagon already exists
			const existingWagon = wagons.find((w) => w.transcoreTag === wagonId);
			if (existingWagon) {
				processLayout.setError('Wagon ID has already been scanned. Please use a different Wagon ID.');
				return;
			}

			//Create the wagon object
			const wagon: Wagon = {
				id: crypto.randomUUID(),
				wagonId: wagonId,
				trainNumber: trainNumber,
				productType: productGrade,
				loadingLocation: loadingLocation,
				created: new Date(),
				sampleId: sampleId,
				syncStatus: 'pending',
			}

			// Save the wagon to IndexedDB
			await indexedDBService.saveRecord('wagons', wagon);

			// Try to sync the wagon
			await syncService.syncWagon(wagon);

			let allWagons = await indexedDBService.getAllRecords('wagons');
			const foundWagon = allWagons.find((w) => w.wagonId === wagonId);
			console.log('Found Wagon:', foundWagon);
			// Create the assay object according to the Assay interface
			const assay: Assay = {
				id: crypto.randomUUID(),
				name: sampleId,
				sampleId: sampleId,
				productType: productGrade,
				location: loadingLocation,
				created: new Date(),
				updated: new Date().toISOString(),
				linkedWagonIds: [foundWagon?.serverId || ''],
				syncStatus: 'pending',
				process: 'West Loadout',
				siteLocation: 'PMC',
			};

			// Save to IndexedDB
			await indexedDBService.saveRecord('assays', assay);

			// Try to sync using the sync service
			await syncService.syncAssay(assay);

			

			// Clear persisted form data
			formPersistenceService.clearForm('west_loadout');

			processLayout.setSuccess('Data saved successfully');
			setTimeout(() => {
				goto(
					`/pmc/processes/magnetite-rail/west-load-out/sampling/verification?wagonId=${encodeURIComponent(wagonId)}`
				);
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
	bind:this={processLayout}
	cancelPath="/pmc/processes/magnetite-rail/west-load-out"
	on:submit={handleSubmit}
	on:cancel={handleCancel}
>
	<div slot="header">
		<h5 class="text-xl font-bold ">Sample Details Capturing</h5>
		<p class="text-sm text-gay">Please enter the sample and product details</p>
	</div>

<div class="container">
	<div class="form">
		<FormField 
			id="wagonId"
			label="Please scan tag/enter Wagon ID"
			bind:value={wagonId}
			placeholder="Enter Wagon ID"
			required={true}
			error={formErrors.wagonId}
		/>
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
			disabled={true}
			error={formErrors.sampleId}
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
		margin-bottom: 1rem;
	}
</style>
