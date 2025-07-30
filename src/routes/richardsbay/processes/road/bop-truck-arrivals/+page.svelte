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
	let showSearch = false;
	let matchFound = false;
	let searchQuery = '';

	let availableTrucks: Truck[] = [];
	let filteredTrucks: any[] = [];
	let showTruckNotFound = false;
	let selectedTruck: any = '';

	// Process steps
	const processSteps = ['Registration', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	onMount(async () => {
		// Fetch all truck arrivals
		const truckArrivals = (await indexedDBService.getAllRecords('truckArrivals')).filter(
			arrival => arrival.port_truck_arrival_timestamp === ''
		);
		
		// Fetch all trucks
		const allTrucks = await indexedDBService.getAllRecords('trucks');

		// Filter trucks that match the truck arrivals' port_arrival_sample_id
		availableTrucks = allTrucks.filter(truck =>
			truckArrivals.some(arrival => arrival.port_arrival_sample_id === truck.registration)
		);
	});

	// Reactive statement to filter trucks based on the search query
	$: {
		filteredTrucks = availableTrucks.filter(truck =>
			truck.registration.toLowerCase().includes(searchQuery.toLowerCase())
		);
	}

	// Reactive statement to set showTruckNotFound based on filteredTrucks
    $: if (filteredTrucks.length === 0 && searchQuery) {
        showTruckNotFound = true;
    }

	$: {
		const matchedTruck = availableTrucks.find(truck => truck.registration === selectedTruck);

		if (matchedTruck) {
			showTruckNotFound = false;
			matchFound = true;
			arrivalTimestamp = formatTimestamp(new Date());
			currentStep = 2;
			submit = false;
		} else if (selectedTruck && filteredTrucks.length !> 0) {
			showTruckNotFound = true;
		} else {
			showTruckNotFound = false;
			matchFound = false;
			currentStep = 1;
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
				arrival => arrival.port_arrival_sample_id === selectedTruck
			)[0];

			// Save to IndexedDB using the generic saveRecord method
			await indexedDBService.updateRecord('truckArrivals', truckArrival.id, {
					...truckArrival,
					syncStatus: 'pending',
					port_truck_arrival_timestamp: new Date().toISOString(),
					status: 'received',
				});

			processLayout.setSuccess('Truck Successfully Received!');

			setTimeout(() => {
				location.reload();
			}, 1000);
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
			<FormField
				id="truckRegistration"
				label="Truck Registration"
				search={true}
				options={filteredTrucks.map(truck => ({ value: truck.registration, label: truck.registration }))}
				bind:value={selectedTruck}
				placeholder="Select Truck Registration"
				required
				on:focus={() => showSearch = true}
				on:blur={() => setTimeout(() => (showSearch = false), 200)}
			/>

			{#if matchFound && !showTruckNotFound}
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
