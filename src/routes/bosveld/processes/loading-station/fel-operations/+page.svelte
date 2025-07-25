<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { formPersistenceService } from '$lib/services/formPersistenceService';

	let wagonInput = '';
	let availableWagons: any[] = [];
	let filteredSuggestions: any[] = [];
	let showSuggestions = false;
	let showNotFound = false;
	let selectedWagon: any = null;
	let highlightedIndex = -1;

	let wagonId = '';
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
					w.loadingLocation === 'Bosveld'
				);
			});

			return wagons;
		} catch (error) {
			console.error('No wagons available', error);
			return [];
		}
	}

	//Search for wagons based on user input
	function handleWagonInput() {
		const value = wagonInput.trim();
		selectedWagon = null;
		showNotFound = false;
		highlightedIndex = -1;

		if (value.length === 0) {
			showSuggestions = false;
			filteredSuggestions = [];
			return;
		}

		filteredSuggestions = availableWagons.filter(wagon =>
			wagon.wagonIdSimple?.toLowerCase().includes(value.toLowerCase()) ||
			wagon.wagonId?.toLowerCase().includes(value.toLowerCase())
		).slice(0, 6);

		const exactMatch = availableWagons.find(wagon =>
			wagon.wagonIdSimple?.toLowerCase() === value.toLowerCase() ||
			wagon.wagonId?.toLowerCase() === value.toLowerCase()
		);

		if (exactMatch) {
			selectedWagon = exactMatch;
			wagonId = exactMatch.wagonId || exactMatch.wagonIdSimple;
			showSuggestions = false;
		} else if (value.length >= 2) {
			showSuggestions = filteredSuggestions.length > 0;
			if (value.length >= 3 && filteredSuggestions.length === 0) {
				showNotFound = true;
			}
		}
	}

	function showAllSuggestions() {
		if (availableWagons.length > 0) {
			filteredSuggestions = availableWagons.slice(0, 6);
			showSuggestions = true;
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
			formPersistenceService.clearForm('loading_station');

			processLayout.setSuccess('Data saved successfully');
			setTimeout(() => {
				// Navigate to verification page
				goto(`/bosveld/processes/loading-station/fel-operations/verification?wagonId=${encodeURIComponent(wagonId)}`);
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
		<label for="wagonId" class="block font-medium text-gray text-sm">Please select Wagon ID *</label>
		<input
			id="wagonId"
			type="text"
			bind:value={wagonInput}
			placeholder="Select Wagon ID"
			on:input={handleWagonInput}
			on:focus={showAllSuggestions}
			on:blur={() => setTimeout(() => showSuggestions = false, 100)}
			required
			class="w-full rounded-lg text-sm border px-3 py-2 text-gray border-gray-300 focus:ring-2 focus:ring-gray-400 focus:outline-none"
		/>
		{#if formErrors.wagonId}
			<div class="text-red-500 mt-1">{formErrors.wagonId}</div>
		{/if}
	
		{#if showSuggestions}
			<ul class="suggestions-list">
				{#each filteredSuggestions as suggestion, i}
					<li>
						<button
							type="button"
							class:selected={i === highlightedIndex}
							on:click={() => {
								wagonInput = suggestion.wagonId;
								wagonId = wagonInput;
								showSuggestions = false;
								selectedWagon = suggestion;
							}}
						>
							{suggestion.wagonId} ({suggestion.wagonIdSimple})
						</button>
					</li>
				{/each}
			</ul>
		{/if}
		{#if showNotFound}
			<div class="text-red-500 mt-1">No matching wagons found.</div>
		{/if}
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

	.suggestions-list {
		border: 1px solid #ccc;
		background: #fff;
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 150px;
		overflow-y: auto;
		position: absolute;
		z-index: 10;
		width: 100%;
	}

	.suggestions-list li:nth-child(even) {
		background: #f6f8fa;
	}
	.suggestions-list li:nth-child(odd) {
		background: #fff;
	}

	.suggestions-list button {
		width: 100%;
		text-align: left;
		padding: 0.5rem;
		background: transparent;
		border: none;
		cursor: pointer;
		color: #222;
		transition: background 0.2s;
	}

	.suggestions-list button.selected,
	.suggestions-list button:hover {
		background: #2563eb;
		color: #fff;
	}

	.suggestions-list li {
		padding: 0;
	}
</style>
