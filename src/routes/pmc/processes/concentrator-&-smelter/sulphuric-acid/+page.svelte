<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { formPersistenceService } from '$lib/services/formPersistenceService';

	import type { Assay } from '$lib/types/assay';
	import type { TruckLoad } from '$lib/types/truckLoad';
	import type { Truck } from '$lib/types/truck';
	import { syncService } from '$lib/services/syncService';

	let truckRegistration = '';
	let availableTrucks: { id: string; registration: string }[] = [];
	let tankLocation = '';
	let loadingLocation = 'Sulphuric Acid';
	let acidType = '';
	let sampleId = '';
	let capturedImage = '';
	let isSubmitting = false;
	let currentStep = 1;
	let samplingStatus = false;

	// Process steps
	const processSteps = ['Truck Details', 'Review'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	// Form errors
	let formErrors = {
		truckRegistration: '',
		tankLocation: '',
		acidType: ''
	};

	const tankLocations = ['Tank 1', 'Tank 2', 'Tank 3', 'Tank 4'];
	const acidTypes = ['Weak Acid', 'Strong Acid'];

	$: {
		const currentDate = new Date();
		const YYMMDD = `${currentDate.getFullYear().toString().slice(-2)}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;

		const productCode = {
			'Weak Acid': 'WEAK',
			'Strong Acid': 'STRONG'
		}[acidType];

		sampleId = `${YYMMDD}${truckRegistration ? `_${truckRegistration}` : ''}${productCode ? `_${productCode}` : ''}`;
	}

	onMount(async () => {
		// Fetch trucks from IndexedDB
		const trucks = await indexedDBService.getRecords('trucks');
		availableTrucks = trucks;
	});

	// Save form data when component is unmounted
	onMount(() => {
		return async () => {
			if (truckRegistration || tankLocation || acidType || sampleId || capturedImage) {
				formPersistenceService.saveForm('acid_truck', {
					truckRegistration,
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
			truckRegistration: '',
			tankLocation: '',
			acidType: ''
		};

		if (!truckRegistration) {
			formErrors.truckRegistration = 'Truck is required';
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

			let linkTruck = (await indexedDBService.getAllRecords('trucks')).filter(
				(truck: Truck) => truck.registration === truckRegistration
			)[0];

			const truckLoad: TruckLoad = {
				id: crypto.randomUUID(),
				truckId: linkTruck?.serverId || '',
				acidType: acidType,
				sampleId: sampleId,
				loadingLocation: loadingLocation,
				created: new Date(),
				updated: new Date().toISOString(),
				siteLocation: 'PMC',
				syncStatus: 'pending',
				samplingStatus: samplingStatus
			}

			await indexedDBService.saveRecord('truckLoads', truckLoad);
			await syncService.syncTruckLoad(truckLoad);

			let newTruckLoad = (await indexedDBService.getAllRecords('truckLoads')).filter(
				(truckLoad: TruckLoad) => truckLoad.sampleId === sampleId
			)[0];

			const assay: Assay = {
				id: crypto.randomUUID(),
				name: sampleId,
				materialType: acidType,
				linkedTruckIds: [newTruckLoad?.serverId || ''],
				syncStatus: 'pending',
				location: loadingLocation,
				created: new Date(),
				updated: new Date().toISOString(),
				sampleId: sampleId,
				siteLocation: 'PMC',
			};

			await indexedDBService.saveRecord('assays', assay);
			await syncService.syncAssay(assay);

			// Clear persisted form data
			formPersistenceService.clearForm('acid_truck');

			processLayout.setSuccess('Data saved successfully');
			setTimeout(() => {
				goto(`/pmc/processes/concentrator-&-smelter/sulphuric-acid/review?sampleId=${sampleId}&truckRegistration=${truckRegistration}`);
			}, 1000);
		} catch (err) {
			processLayout.setError('Failed to submit data');
			console.error(err);
		} finally {
			isSubmitting = false;
		}
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
			bind:value={truckRegistration}
			placeholder="Select Truck Registration"
			search={true}
			options={availableTrucks.map((truck) => ({ value: truck.registration, label: truck.registration  }))}
			required={true}
			error={formErrors.tankLocation}
		/>

		<FormField
			id="tankLocation"
			label="Tank Loaded From"
			bind:value={tankLocation}
			placeholder="Select Tank Location"
			isSelect={true}
			options={tankLocations.map((location) => ({ value: location, label: location }))}
			required={true}
			error={formErrors.tankLocation}
		/>

		<FormField
			id="acidType"
			label="Strong Acid/Weak Acid"
			bind:value={acidType}
			placeholder="Select Acid Type"
			isSelect={true}
			options={acidTypes.map((type) => ({ value: type, label: type }))}
			required={true}
			error={formErrors.acidType}
		/>

		<div class="form-field">
			<div class="relative">
				<FormField
					id="sampleId"
					label="Sample ID"
					bind:value={sampleId}
					disabled={true}
					placeholder="Enter Sample ID"
				/>
				<div class="absolute inset-y-0 right-0 flex items-center pr-3" style="margin-top: 25px;">
					<input
						id="sampleIdCheckbox"
						type="checkbox"
						class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
						bind:checked={samplingStatus}
					/>
					<label for="sampleIdCheckbox" class="ml-2 text-sm font-medium text-gray-700"></label>
				</div>
			</div>
		</div>
	</div>
</ProcessLayout>

<style>
	.container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
