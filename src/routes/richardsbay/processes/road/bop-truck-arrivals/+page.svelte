<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Truck } from '$lib/types/truck';

	// Form state
	let truckRegistration = '';
	let isSubmitting = false;
	let submit = false;
	let currentStep = 1;
	let arrivalTimestamp = formatTimestamp(new Date());

	let availableTrucks: Truck[] = [];
	let filteredTruckSuggestions: Truck[] = [];
	let showTruckSuggestions = false;
	let showTruckNotFound = false;
	let selectedTruck: Truck | null = null;

	// Process steps
	const processSteps = ['Registration', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	onMount(async () => {
		availableTrucks = (await indexedDBService.getAllRecords('trucks')).filter(
			truck => truck.loadingLocation === 'BOP' && !truck.updated
		);
	});

	function handleTruckInput() {
		const value = truckRegistration.trim();
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
			truckRegistration = exactMatch.registration;
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

	function formatTimestamp(date: Date) {
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		const dd = String(date.getDate()).padStart(2, '0');
		const hh = String(date.getHours()).padStart(2, '0');
		const min = String(date.getMinutes()).padStart(2, '0');
		return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
	}

	async function handleSubmit() {
		try {
			isSubmitting = true;
			submit = true;
			processLayout.setError('');

			// Check if truck exists in Pocketbase DB
			const pbTrucks = await indexedDBService.getAllRecords('trucks');
			const truckToUse = pbTrucks.find(truck => truck.registration === truckRegistration);

			if (!truckToUse) {
				processLayout.setError('Truck Not in Pre-Registration List');
				isSubmitting = false;
				return;
			}

			// Update truck
			await indexedDBService.updateRecord('trucks', truckToUse.serverId ?? truckToUse.id, {
				...truckToUse,
				syncStatus: 'pending',
				updated: new Date().toDateString(),
			});

			// Update Truck Arrival data
			const truckArrival = (await indexedDBService.getAllRecords('truckArrivals')).filter(
				arrival => arrival.port_arrival_sample_id === truckRegistration
			)[0];

			// Save to IndexedDB using the generic saveRecord method
			await indexedDBService.updateRecord('truckArrivals', truckArrival.serverId ?? truckArrival.id, {
					...truckArrival,
					syncStatus: 'pending',
					port_truck_arrival_timestamp: new Date().toISOString(),
					status: 'received',
				});

			processLayout.setSuccess('Truck Successfully Received!');

			setTimeout(() => {
				goto('/richardsbay/processes/road');
			}, 2000);
		} catch (error) {
			console.error('Failed to submit truck arrival:', error);
			processLayout.setError('Failed to submit truck arrival. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}

	async function handleNewTruck() {
		const truckArrivalExists = (await indexedDBService.getAllRecords('truckArrivals')).filter(
			arrival => arrival.port_arrival_sample_id === truckRegistration
		)[0];
		if (truckArrivalExists) {
			processLayout.setError('Truck Has Been Already Received');
			return;
		} else {
			goto('/richardsbay/processes/road/bop-truck-arrivals/register?truckRegistration=' + truckRegistration);
		}
	}

	function handleCancel() {
		goto('/richardsbay/processes/road');
	}

</script>

<ProcessLayout
	title="BOP Truck Arrival"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	showSubmit={!showTruckNotFound}
	cancelPath="/richardsbay/processes/road"
	bind:this={processLayout}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
	<div slot="header">
		<h5 class="text-xl font-bold text-gray">Truck Arrival</h5>
	</div>

	<div class="space-y-6">
		<div class="form">
			<label for="truckRegistration">Truck Registration</label>
			<input
				id="truckRegistration"
				type="text"
				bind:value={truckRegistration}
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
									truckRegistration = suggestion.registration;
									showTruckSuggestions = false;
									selectedTruck = suggestion;
									currentStep = 2;
								}}
							>
								{suggestion.registration}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
			{#if selectedTruck}
				<div style="margin-top: 1.2rem;">
					<FormField
						id="arrivalTimestamp"
						label="Arrival Timestamp:"
						bind:value={arrivalTimestamp}
						placeholder="Enter vehicle registration"
						disabled={true}
					/>
				</div>
				{#if !submit}
					<div style="margin-top: 1.5rem;" class="text-green-500 mt-1 font-bold text-center">Truck Successfully Received</div>
				{/if}
			{/if}
			{#if showTruckNotFound}
				{ @html `<script>showSubmit = false;</script>` }
				<div class="text-red-500 mt-1 font-bold text-center">Truck Not in Pre-Registration List. Please register the truck</div>
				<div>
					<button class='register' on:click={() => handleNewTruck()} type="button">
						Register Truck
					</button>
				</div>
			{/if}
		</div>
	</div>
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
		margin: 0;
	}

	.text-red-500.mt-1.font-bold.text-center {
		margin-top: 1.5rem;
	}

	.register {
		width: 100%;
		color: white;
		padding: 0.5rem;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		font-weight: bold;
		text-align: center;
		margin-top: 1.2rem;
	}
</style>
