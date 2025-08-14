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
	let photoData = '';
	let availableTrucks: Truck[] = [];
	let filteredTrucks: any[] = [];
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

		// Get linked trucks from truck arrivals
		const linkedTrucks = truckArrivals.map(arrival => arrival.truckId);

		// Fetch all trucks
		const allTrucks = (await indexedDBService.getAllRecords('trucks')).filter(
			truck => truck.loadingLocation === 'PMC'
		);

		// Filter trucks that match the truck arrivals' port_arrival_sample_id
		availableTrucks = allTrucks.filter(truck =>
			truckArrivals.some(arrival => arrival.truckId === truck.serverId)
		);
	});

	$: {
		if (selectedTruck) {
			if (filteredTrucks.length > 0) {
				matchFound = filteredTrucks.some(truck => truck.registration.toLowerCase() === selectedTruck.toLowerCase());
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
		// Example: read as base64 or save to DB
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

			// Check if truck exists in Pocketbase DB
			const trucks = (await indexedDBService.getAllRecords('trucks')).filter(
				truck => truck.registration.toLowerCase() === selectedTruck.toLowerCase()
			)[0];

			// Update Truck Arrival data
			const truckArrival = (await indexedDBService.getAllRecords('truckArrivals')).filter(
				arrival => arrival.truckId === trucks.serverId
			)[0];

			// Save to IndexedDB using the generic saveRecord method
			await indexedDBService.updateRecord('truckArrivals', truckArrival.id, {
					...truckArrival,
					syncStatus: 'pending',
					port_truck_arrival_timestamp: new Date().toISOString(),
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

	function handleCancel() {
		goto('/richardsbay/processes/road');
	}

</script>

<ProcessLayout
	title="PMC Truck Arrival"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
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
				{#if !submit}
					<div style="margin-top: 1.5rem;" class="text-green-500 mt-1 font-bold text-center">Truck Successfully Received</div>
				{/if}
			{/if}
		</div>
	</div>
</ProcessLayout>

<style>
	.form {
		margin-top: 1rem;
		position: relative;
	}
</style>
