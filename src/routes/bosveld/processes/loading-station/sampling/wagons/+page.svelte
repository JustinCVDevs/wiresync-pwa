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
	import { pocketbaseService } from '$lib/services/pocketbaseService';

	let sampleId = '';
	let trainNumber = '';
	let wagonIdSimple = $page.url.searchParams.get('wagonIdSimple') || '';
	let shuntingTrainIdsParam = $page.url.searchParams.get('shuntingTrainIds') || '';
	let shuntingTrainIds = shuntingTrainIdsParam ? shuntingTrainIdsParam.split(',') : [];
	let linkedWagonIdsParam = $page.url.searchParams.get('wagonIds') || '';
	let linkedWagonIds = linkedWagonIdsParam ? linkedWagonIdsParam.split(',') : [];
	let productGrade = localStorage.getItem('productGrade') || '';
	let loadingLocation = 'Bosveld';
	let isSubmitting = false;
	let currentStep = 2;

	let selectedWagonId = '';
	let selectedWagon = '';
	let availableWagons: any[] = [];
	let editingWagon: any = null;

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
		if (editingWagon) {
			goto(`/bosveld/processes/loading-station/sampling/wagons/review?shuntingTrainIds=${shuntingTrainIds.join(',')}&wagonIds=${linkedWagonIds.join(',')}`);
		} else {
			goto('/bosveld/processes/loading-station/sampling');
		}
	}

	// Form errors
	let formErrors = {
		sampleId: '',
		productGrade: '',
		selectedWagon: '',
		trainNumber: ''
	};

	async function fetchData() {
		if (!wagonIdSimple) return;

		const wagon = (await indexedDBService.getAllRecords('wagons')).find(
			(w) => w.wagonIdSimple === wagonIdSimple
		);

		if (wagon) {
			editingWagon = wagon;
			selectedWagon = wagon.wagonIdSimple || '';
			productGrade = wagon.productType || '';
			trainNumber = wagon.trainNumber || '';
		}
	}

	$: if (selectedWagonId) {
		selectedWagon = availableWagons.find(wagon => wagon.wagonId === selectedWagonId)?.wagonIdSimple || '';
	}

	$: {
		const currentDate = new Date();
		const YYMMDD = `${currentDate.getFullYear().toString().slice(-2)}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;
		const productCode = {
			'Iron Oxide': 'IOX',
			'Magnetite-DMS': 'DMS',
			'Magnetite 62%': 'MAG62',
			'Magnetite 65%': 'MAG65'
		}[productGrade];
		sampleId = `${YYMMDD}${selectedWagon ? `_${selectedWagon}` : ''}${trainNumber ? `_${trainNumber}` : ''}${productCode ? `_${productCode}` : ''}`;
	}

	const productGrades = ['Iron Oxide', 'Magnetite-DMS', 'Magnetite 62%', 'Magnetite 65%'];

	const loadingLocations = ['East Load Out', 'West Load Out', 'Bosveld'];

	// Save form data when component is unmounted
	onMount(() => {
		loadPersistedData();
		return () => {
			if (sampleId || productGrade) {
				formPersistenceService.saveForm('loading_station', {
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
		availableWagons = (await indexedDBService.getAllRecords('wagons')).filter(
			(w: any) => linkedWagonIds.includes(w.serverId) && !w.sampleTimestamp
		).sort((a, b) => (a.wagonIdSimple || '').localeCompare(b.wagonIdSimple || ''));
		if (wagonIdSimple) await fetchData();
	});

	function loadPersistedData() {
		const savedData = formPersistenceService.loadForm<{
			loadingLocation: string;
		}>('loading_station');

		if (savedData) {
			loadingLocation = savedData.loadingLocation || 'Bosveld';
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

			if (wagonIdSimple && editingWagon) {
				// Edit mode — update the existing wagon
				await indexedDBService.updateRecord('wagons', editingWagon.id, {
					...editingWagon,
					wagonIdSimple: selectedWagon,
					productType: productGrade,
					trainNumber,
					loadingLocation,
					sampleId,
					syncStatus: 'pending',
					updated: formatTimestamp(new Date()),
					isWireSynced: false
				});

				// Update the linked assay if one exists
				const wagonIdToUse = editingWagon.serverId || editingWagon.id;
				const allAssays = await indexedDBService.getAllRecords('assays');
				const matchingAssay = allAssays.find((a: any) => a.linkedWagonIds?.includes(wagonIdToUse));
				if (matchingAssay) {
					await indexedDBService.updateRecord('assays', matchingAssay.id, {
						...matchingAssay,
						name: sampleId,
						sampleId,
						productType: productGrade,
						location: loadingLocation,
						syncStatus: 'pending',
						updated: new Date().toISOString(),
						isWireSynced: false
					});
				}

				formPersistenceService.clearForm('loading_station');
				processLayout.setSuccess('Data updated successfully');
				setTimeout(() => {
					goto(
						`/bosveld/processes/loading-station/sampling/wagons/review?shuntingTrainIds=${shuntingTrainIds.join(',')}&wagonIds=${linkedWagonIds.join(',')}`
					);
				}, 1000);
			} else if (selectedWagonId) {
				let wagon = availableWagons.find((w) => w.wagonId === selectedWagonId);

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
				wagon.isWireSynced = false;

				await indexedDBService.updateRecord('wagons', wagon.id, wagon);

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
					user: pocketbaseService.currentUser?.id || '',
					isWireSynced: false,
					siteLocation: 'Bosveld'
				};

				await indexedDBService.saveRecord('assays', assay);
				await syncService.syncAssay(assay);

				formPersistenceService.clearForm('loading_station');
				processLayout.setSuccess('Data saved successfully');
				setTimeout(() => {
					goto(
						`/bosveld/processes/loading-station/sampling/wagons/review?shuntingTrainIds=${shuntingTrainIds.join(',')}&wagonIds=${linkedWagonIds.join(',')}`
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
	cancelPath={wagonIdSimple
		? `/bosveld/processes/loading-station/sampling/wagons/review?shuntingTrainIds=${shuntingTrainIds.join(',')}&wagonIds=${linkedWagonIds.join(',')}`
		: '/bosveld/processes/loading-station/sampling'}
	on:submit={handleSubmit}
	on:cancel={handleCancel}
>
	<div slot="header">
		<h5 class="text-xl font-bold">Sample Details Capturing</h5>
		<p class="text-sm text-gray-500">Please enter the sample and product details</p>
	</div>

<div class="container">
	<div class="form">
		{#if wagonIdSimple === ''}
			<FormField
				id="wagonId"
				label="Wagon ID"
				search={true}
				options={availableWagons.map(wagon => ({value: wagon.wagonId, label: wagon.wagonIdSimple}))}
				bind:value={selectedWagonId}
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
<QRPrinting {sampleId} />
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
