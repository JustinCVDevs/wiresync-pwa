<script lang="ts">
	import YesNo from '$lib/components/YesNo.svelte';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { onMount } from 'svelte';
	import { formPersistenceService } from '$lib/services/formPersistenceService';
	import { syncService } from '$lib/services/syncService';
  
	let dedicatedFleet = '';
	let isDedicatedFleet = false;

	let felWeight = '';
	let loadingLocation = 'Gravelotte';
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
				truck => truck.loadingLocation === 'Gravelotte' && !truck.updated
			);
			
			let filteredTrucks: any[] = [];

			if (dedicatedFleet === 'Yes') {
				const allAssays = (await indexedDBService.getAllRecords('assays')).filter(
					(a) => a.location === 'Gravelotte' && a.dedicatedFleet === true
				);

				// Collect all linkedTruckIds from all relevant assays
				const linkedTruckIds = allAssays
					.flatMap(a => a.linkedTruckIds ?? []);

				// Filter trucks whose serverId matches any linkedTruckId
				filteredTrucks = allTrucks.filter(
					truck => linkedTruckIds.includes(truck.serverId ?? '')
				);
			} else {
				const allAssays = (await indexedDBService.getAllRecords('assays')).filter(
					(a) => a.location === 'Gravelotte' && a.dedicatedFleet === false
				);

				// Collect all linkedTruckIds from all relevant assays
				const linkedTruckIds = allAssays
					.flatMap(a => a.linkedTruckIds ?? []);

				// Filter trucks whose serverId matches any linkedTruckId
				filteredTrucks = allTrucks.filter(
					truck => linkedTruckIds.includes(truck.serverId ?? '')
				);
			}
			return filteredTrucks;
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
			if (dedicatedFleet === 'Yes') {
				isDedicatedFleet = true;
				
				if (selectedTruck) {
					const fleet = (await indexedDBService.getAllRecords('fleet')).filter(
						(f) => f.id === selectedTruck.linkedFleetIds[0] || f.serverId === selectedTruck.linkedFleetIds[0]
					)[0];

					selectedTruck.dedicatedFleet = true;
					selectedTruck.loadingLocation = loadingLocation;
					selectedTruck.updated = new Date().toISOString();
					selectedTruck.syncStatus = 'pending';

					await indexedDBService.updateRecord('trucks', selectedTruck.id, selectedTruck);

					
					await indexedDBService.updateRecord('fleet', fleet.id ?? '', {
						loadingLocation: loadingLocation,
						felMassKg: Number(felWeight),
					});

					formPersistenceService.clearForm('fel-operations-gravelotte');

				goto(`/pmc/processes/magnetite-road/gravelotte/fel-operations/verification?truckRegistration=${encodeURIComponent(selectedTruck?.registration || '')}&fleetServerId=${encodeURIComponent(fleet?.serverId || '')}`);
				}	
			}else {
				isDedicatedFleet = false;
				
				if (selectedTruck) {
					selectedTruck.dedicatedFleet = false;
					selectedTruck.loadingLocation = loadingLocation;
					selectedTruck.updated = new Date().toISOString();
					selectedTruck.felWeight = Number(felWeight);
					selectedTruck.syncStatus = 'pending';

					await indexedDBService.updateRecord('trucks', selectedTruck.id, selectedTruck);
				}

				formPersistenceService.clearForm('fel-operations-gravelotte');

				goto(`/pmc/processes/magnetite-road/gravelotte/fel-operations/verification?truckRegistration=${encodeURIComponent(selectedTruck?.registration || '')}`);
			}
			
		} catch (err) {
			error = 'Failed to submit data';
			console.error(err);
		}
	  }
	  let currentStep = 1;
	  function handleCancel() {
		  goto('/pmc/processes/magnetite-road');
	  }

	$: if (dedicatedFleet !== '') {
		(async () => {
			availableTrucks = await getTrucks();
		})();
	}
</script>
	<ProcessLayout
      title="Gravelotte"
	{steps}
	{currentStep}
	isSubmitting={false}
	bind:this={processLayout}
	cancelPath="/pmc/processes/magnetite-road"
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
			<h2 class="">Material Data Capturing</h2>
				<YesNo 
					bind:selected={dedicatedFleet} 
					label={"Dedicated Fleet"} 
					description={"Please specify wether the truck is part of a fleet."}
				/>

				{#if dedicatedFleet}
					{#if dedicatedFleet === 'No'}
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

						<FormField
							id="loadingLocation"
							label="Loading Location"
							isSelect={true}
							options={[
								{ value: 'West Load Out', label: 'West Load Out' },
								{ value: 'Gravelotte', label: 'Gravelotte' },
								{ value: 'Truck Load Out', label: 'Truck Load Out' }
							]}
							bind:value={loadingLocation}
							required
						/>
					{:else}
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

						<FormField
							id="loadingLocation"
							label="Loading Location"
							isSelect={true}
							options={[
								{ value: 'West Load Out', label: 'West Load Out' },
								{ value: 'Gravelotte', label: 'Gravelotte' },
								{ value: 'Truck Load Out', label: 'Truck Load Out' }
							]}
							bind:value={loadingLocation}
							required
						/>
					{/if}
				{/if}
			
	</ProcessLayout>
<style>
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