<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Truck } from '$lib/types/truck';
	import Camera from '$lib/components/Camera.svelte';

	// Form state
	let isSubmitting = false;
	let submit = false;
	let currentStep = 1;
	let arrivalTimestamp = formatTimestamp(new Date());
	let showSearch = false;
	let matchFound = false;
	let photoData: string = '';
	let availableTrucks: Truck[] = [];
	let filteredTrucks: any[] = [];
	let showTruckNotFound = false;
	let selectedTruck: any = '';

	// Process steps
	const processSteps = ['Registration', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	// Function to load truck data
	async function loadTruckData() {
		// Fetch all truck arrivals
		const truckArrivals = (await indexedDBService.getAllRecords('truckArrivals')).filter(
			arrival => arrival.port_truck_arrival_timestamp === ''
		);

		// Fetch all trucks
		const allTrucks = (await indexedDBService.getAllRecords('trucks')).filter(
			truck => truck.loadingLocation === 'BOP'
		);

		// Filter trucks that match the truck arrivals' truckId
		// Check both local id and serverId to handle synced and unsynced trucks
		availableTrucks = allTrucks.filter(truck =>
			truckArrivals.some(arrival => 
				arrival.truckId === truck.id || arrival.truckId === truck.serverId
			)
		);
	}

	onMount(() => {
		loadTruckData();
		
		// Refresh data when page becomes visible (user returns from registration)
		const handleVisibilityChange = () => {
			if (!document.hidden) {
				loadTruckData();
			}
		};
		
		document.addEventListener('visibilitychange', handleVisibilityChange);
		
		// Cleanup
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	});

	$: {
		if (selectedTruck) {
			if (filteredTrucks.length > 0) {
				matchFound = filteredTrucks.some(truck => truck.registration.toLowerCase() === selectedTruck.toLowerCase());
			} else {
				showTruckNotFound = true;
			}
		}
	}

	$: {
		filteredTrucks = availableTrucks.filter(truck =>
			truck.registration.toLowerCase().includes(selectedTruck?.toLowerCase() ?? '')
		);
	}

	function formatTimestamp(date: Date) {
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		const dd = String(date.getDate()).padStart(2, '0');
		const hh = String(date.getHours()).padStart(2, '0');
		const min = String(date.getMinutes()).padStart(2, '0');
		return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
	}

	function handlePhotoSelected(file: File) {
		if (!file) return;

		const reader = new FileReader();
		reader.onload = () => {
			photoData = reader.result as string;
		};
		reader.readAsDataURL(file);
	}

	async function handleSubmit() {
		try {
			isSubmitting = true;
			submit = true;
			processLayout.setError('');

			if (!photoData) {
				processLayout.setError('Please take a photo of the truck.');
				return;
			}

			// Check if truck exists in IndexedDB
			const trucks = (await indexedDBService.getAllRecords('trucks')).filter(
				truck => truck.registration.toLowerCase() === selectedTruck.toLowerCase()
			)[0];

			// Update Truck Arrival data
			// Check both serverId and local id to handle synced and unsynced trucks
			const truckArrival = (await indexedDBService.getAllRecords('truckArrivals')).filter(
				arrival => arrival.truckId === trucks.serverId || arrival.truckId === trucks.id
			)[0];

			// Save to IndexedDB using the generic saveRecord method
			await indexedDBService.updateRecord('truckArrivals', truckArrival.id, {
					...truckArrival,
					syncStatus: 'pending',
					port_truck_arrival_timestamp: formatTimestamp(new Date()),
					status: 'received',
					truck_photo: photoData
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
		goto(`/richardsbay/processes/road/bop-truck-arrivals/register?truckRegistration=${encodeURIComponent(selectedTruck)}`);
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

				<div style="margin-top: 1.2rem;">
					<Camera onPhotoSelected={handlePhotoSelected} />
				</div>
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
