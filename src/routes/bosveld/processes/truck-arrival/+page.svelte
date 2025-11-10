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
	let availableTrucks: any[] = [];
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

			// Show only truck arrivals for today (with duplicates, each with its timestamp)
			const today = new Date();
			const yyyy = today.getFullYear();
			const mm = String(today.getMonth() + 1).padStart(2, '0');
			const dd = String(today.getDate()).padStart(2, '0');
			const todayStr = `${yyyy}-${mm}-${dd}`;

			availableTrucks = cachedTruckArrivals
				.filter(arrival => {
					if (!arrival.gross_timestamp) return false;
					const arrivalDate = new Date(arrival.gross_timestamp);
					const arrivalY = arrivalDate.getFullYear();
					const arrivalM = String(arrivalDate.getMonth() + 1).padStart(2, '0');
					const arrivalD = String(arrivalDate.getDate()).padStart(2, '0');
					const arrivalStr = `${arrivalY}-${arrivalM}-${arrivalD}`;
					return arrivalStr === todayStr;
				})
				.map(arrival => {
					const truck = allTrucks.find(truck => (truck.serverId || truck.id) === arrival.truckId);
					if (!truck) return undefined;
					return { truck, arrival };
				})
				.filter((t): t is { truck: Truck; arrival: TruckArrival } => t !== undefined);

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
	});

	// Optimized reactive filtering - only filter when needed
	$: {
		if (selectedTruck && availableTrucks.length > 0) {
			const searchTerm = selectedTruck.toLowerCase();
			filteredTrucks = availableTrucks.filter(({ truck, arrival }) =>
				(`${truck.registration}|${arrival.id}`).toLowerCase().includes(searchTerm)
			);
			matchFound = filteredTrucks.some(({ truck, arrival }) => `${truck.registration}|${arrival.id}`.toLowerCase() === searchTerm);
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

	function formatGrossTimestamp(date: Date) {
		const hh = String(date.getHours()).padStart(2, '0');
		const min = String(date.getMinutes()).padStart(2, '0');
		const ss = String(date.getSeconds()).padStart(2, '0');
		return `${hh}:${min}:${ss}`;
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
				return;
			}


			// Extract registration from selectedTruck value (registration|arrival.id)
			const selectedTruckRegistration = selectedTruck.split('|')[0].toLowerCase();
			const trucks = cachedTrucks.get(selectedTruckRegistration);

			if (!trucks) {
				processLayout.setError('Truck not found. Please select a valid truck.');
				return;
			}

			// Find matching truck arrival from cached data
			const truckArrival = cachedTruckArrivals.find(
				arrival => arrival.truckId === trucks.serverId && arrival.status !== 'received'
			);

			if (!truckArrival) {
				processLayout.setError('No matching truck arrivals found for this registration.');
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
					options={filteredTrucks
						.slice()
						.sort((a, b) => {
							const aTime = a.arrival.gross_timestamp ? new Date(a.arrival.gross_timestamp).getTime() : 0;
							const bTime = b.arrival.gross_timestamp ? new Date(b.arrival.gross_timestamp).getTime() : 0;
							return bTime - aTime;
						})
						.map(({ truck, arrival }) => ({
							value: `${truck.registration}|${arrival.id}`,
							label: `${truck.registration} - ${arrival.gross_timestamp ? formatGrossTimestamp(new Date(arrival.gross_timestamp)) : ''}`
						}))}
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
