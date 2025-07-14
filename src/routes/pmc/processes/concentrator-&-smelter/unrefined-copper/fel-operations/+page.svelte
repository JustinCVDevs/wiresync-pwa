<script lang="ts">
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { onMount } from 'svelte';
	import { formPersistenceService } from '$lib/services/formPersistenceService';
  
	let felWeight = '';
	let error = '';
	let processLayout: ProcessLayout;

	let truckInput = '';
	let availableTrucks: any[] = [];
	let filteredTruckSuggestions: any[] = [];
	let showTruckSuggestions = false;
	let showTruckNotFound = false;
	let selectedTruck: any = null;

	const steps = [
		"FEL Details",
		"Complete"
	]

	onMount(async () => {
		availableTrucks = await getTrucks();
	});

	async function getTrucks() {
		try {
			const allTrucks = (await indexedDBService.getAllRecords('trucks')).filter(
				truck => truck.loadingLocation === 'Unrefined Copper' && !truck.updated
			);
			return allTrucks;
		} catch (error) {
			console.error('No trucks available', error);
			return [];
		}
	}

	function handleTruckInput() {
		const value = truckInput.trim();
		selectedTruck = null;
		showTruckNotFound = false;

		if (value.length === 0) {
			showTruckSuggestions = false;
			filteredTruckSuggestions = [];
			return;
		}

		filteredTruckSuggestions = availableTrucks.filter(truck =>
			truck.registration?.toLowerCase().includes(value.toLowerCase())
		).slice(0, 6);

		const exactMatch = availableTrucks.find(truck =>
			truck.registration?.toLowerCase() === value.toLowerCase()
		);

		if (exactMatch) {
			selectedTruck = exactMatch;
			truckInput = exactMatch.registration;
			showTruckSuggestions = false;
		} else if (value.length >= 2) {
			showTruckSuggestions = filteredTruckSuggestions.length > 0;
			if (value.length >= 3 && filteredTruckSuggestions.length === 0) {
				showTruckNotFound = true;
			}
		}
	}

	function showAllTruckSuggestions() {
		if (availableTrucks.length > 0) {
			filteredTruckSuggestions = availableTrucks.slice(0, 6);
			showTruckSuggestions = true;
		}
	}
	
	async function handleSubmit() {
		try {
			processLayout.setError('');
			processLayout.setSuccess('');
			if (selectedTruck) {
				selectedTruck.updated = new Date().toISOString();
				selectedTruck.felWeight = Number(felWeight);
				selectedTruck.syncStatus = 'pending';

				await indexedDBService.updateRecord('trucks', selectedTruck.id, selectedTruck);
			}

			formPersistenceService.clearForm('fel-operations-unrefined-copper');

			goto(`/pmc/processes/concentrator-&-smelter/unrefined-copper/fel-operations/verification?truckRegistration=${encodeURIComponent(selectedTruck?.registration || '')}`);
		} catch (err) {
			error = 'Failed to submit data';
			console.error(err);
		}
	  }
	  let currentStep = 1;
	  function handleCancel() {
		  goto('/pmc/processes/concentrator-&-smelter/unrefined-copper');
	  }

	$: if (truckInput !== '') {
		(async () => {
			availableTrucks = await getTrucks();
		})();
	}
</script>
	<ProcessLayout
    title="Copper Concentrate"
    {steps}
    {currentStep}
    isSubmitting={false}
    bind:this={processLayout}
    cancelPath="/pmc/processes/concentrator-&-smelter/unrefined-copper"
    on:cancel={handleCancel}
    on:submit={handleSubmit}
    on:error={({ detail }) => (error = detail)}
	>
	<slot name="header" />
	
		{#if error}
			<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
				{error}
			</div>
		{/if}
			<h2 class='header'>Material Data Capturing</h2>
			<span class='note' style="margin-top: -0.2rem; display: block; font-size: 12px;">Please note that every truck has to be sampled</span>

				<div class="form">
					<label for="truckRegistration">Select the Truck Registration</label>
					<input
						id="truckRegistration"
						type="text"
						bind:value={truckInput}
						placeholder="Enter Truck Registration"
						on:input={handleTruckInput}
						on:focus={showAllTruckSuggestions}
						on:blur={() => setTimeout(() => showTruckSuggestions = false, 100)}
						required
						class="form-input"
					/>
					{#if showTruckSuggestions}
						<ul class="suggestions-list">
							{#each filteredTruckSuggestions as suggestion, i}
								<li>
									<button
										type="button"
										on:click={() => {
											truckInput = suggestion.registration;
											showTruckSuggestions = false;
											selectedTruck = suggestion;
										}}
									>
										{suggestion.registration}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
					{#if showTruckNotFound}
						<div class="text-red-500 mt-1">No matching trucks found.</div>
					{/if}
				</div>

				<FormField
					id="felWeight"
					label="FEL Weight (Tons)"
					type="number"
					bind:value={felWeight}
					placeholder="Enter FEL Weight"
					required
				/>
	</ProcessLayout>
<style>
	.header {
		font-size: 1.3rem;
		font-weight: bold;
		margin-bottom: 0.5rem;
		color: #333;
	}
	.form {
		margin-top: 1rem;
		position: relative;
	}
	.form #truckRegistration {
		min-height: 40px;
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

	.suggestions-list button:hover {
		background: #2563eb;
		color: #fff;
	}

	.suggestions-list li {
		padding: 0;
	}

</style>