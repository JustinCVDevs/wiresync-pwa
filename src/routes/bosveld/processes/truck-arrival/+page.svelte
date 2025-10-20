<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Truck } from '$lib/types/truck';
	import type { TruckArrival } from '$lib/types/truckArrival';
	import Camera from '$lib/components/Camera.svelte';

	// Form state
	let isSubmitting = false;
	let submit = false;
	let currentStep = 1;
	let arrivalTimestamp = formatTimestamp(new Date());
	let showSearch = false;
	let matchFound = false;
	let photoData = '';
	let availableTrucks: Truck[] = [];
	let filteredTrucks: any[] = [];
	let selectedTruck: any = '';
	let isLoading = true;

	// Cache data to avoid re-fetching
	let cachedTruckArrivals: TruckArrival[] = [];
	let cachedTrucks: Map<string, Truck> = new Map();

	// Process steps
	const processSteps = ['Registration', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	onMount(async () => {
		// Use setTimeout to avoid blocking the UI thread
		setTimeout(async () => {
			try {
				// Fetch data in parallel for better performance
				const [allTruckArrivals, allTrucks] = await Promise.all([
					indexedDBService.getAllRecords('truckArrivals'),
					indexedDBService.getAllRecords('trucks')
				]);

				// Filter truck arrivals - only pending arrivals for Bosveld
				cachedTruckArrivals = allTruckArrivals.filter(
					arrival => !arrival.port_truck_arrival_timestamp && arrival.siteLocation === 'Bosveld'
				);

				// Create a Set for O(1) lookup performance
				const linkedTruckIds = new Set(cachedTruckArrivals.map(arrival => arrival.truckId));

				// Filter trucks efficiently using Set lookup
				availableTrucks = allTrucks.filter(truck => linkedTruckIds.has(truck.serverId || truck.id));

				// Cache trucks in a Map for fast lookup during submit
				allTrucks.forEach(truck => {
					cachedTrucks.set(truck.registration.toLowerCase(), truck);
				});

				isLoading = false;
			} catch (error) {
				console.error('Error loading data:', error);
				processLayout?.setError('Failed to load truck data. Please refresh the page.');
				isLoading = false;
			}
		}, 0);
	});

	// Optimized reactive filtering - only filter when needed
	$: {
		if (selectedTruck && availableTrucks.length > 0) {
			const searchTerm = selectedTruck.toLowerCase();
			filteredTrucks = availableTrucks.filter(truck =>
				truck.registration.toLowerCase().includes(searchTerm)
			);
			matchFound = filteredTrucks.some(truck => truck.registration.toLowerCase() === searchTerm);
		} else {
			filteredTrucks = availableTrucks;
			matchFound = false;
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

	function handlePhotoSelected(file: File) {
		if (!file) return;
		// Read as base64 or save to DB
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
				isSubmitting = false;
				return;
			}

			// Use cached data instead of re-fetching
			const selectedTruckLower = selectedTruck.toLowerCase();
			const trucks = cachedTrucks.get(selectedTruckLower);

			if (!trucks) {
				processLayout.setError('Truck not found. Please select a valid truck.');
				isSubmitting = false;
				return;
			}

			// Find matching truck arrival from cached data
			const truckArrival = cachedTruckArrivals.find(
				arrival => arrival.truckId === trucks.serverId && arrival.status !== 'received'
			);

			if (!truckArrival) {
				processLayout.setError('No matching truck arrivals found for this registration.');
				isSubmitting = false;
				return;
			}

			// Save to IndexedDB using the generic saveRecord method
			await indexedDBService.updateRecord('truckArrivals', truckArrival.id, {
					...truckArrival,
					syncStatus: 'pending',
					port_truck_arrival_timestamp: new Date(),
					status: 'received',
					truck_photo: photoData
				});

			goto('/bosveld/processes/truck-arrival/verification?truckArrivalId=' + truckArrival.id);
		} catch (error) {
			console.error('Failed to submit truck arrival:', error);
			processLayout.setError('Failed to submit truck arrival. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/bosveld/processes');
	}

</script>

<ProcessLayout
	title="Bosveld Truck Arrival"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/bosveld/processes"
	bind:this={processLayout}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
	<div slot="header">
		<h5 class="text-xl font-bold text-gray">Truck Arrival</h5>
	</div>

	<div class="space-y-6">
		{#if isLoading}
			<div class="flex flex-col items-center justify-center py-12">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
				<p class="text-gray-600">Loading truck data...</p>
			</div>
		{:else}
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

				{#if matchFound}
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
			</div>
		{/if}
	</div>
</ProcessLayout>

<style>
	.form {
		margin-top: 1rem;
		position: relative;
	}
</style>
