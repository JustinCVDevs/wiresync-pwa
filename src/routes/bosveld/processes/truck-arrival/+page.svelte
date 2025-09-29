<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { syncService } from '$lib/services/syncService';
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
			arrival => !arrival.port_truck_arrival_timestamp && arrival.siteLocation === 'Bosveld'
		);

		// Get linked trucks from truck arrivals
		const linkedTrucks = truckArrivals.map(arrival => arrival.truckId);

		// Fetch all trucks
		const allTrucks = (await indexedDBService.getAllRecords('trucks'));

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

	// Function moved to Camera.svelte component

	// Handle photo selection from Camera component
	function handlePhotoSelected(file: File) {
		if (!file) return;
		
		// File is already resized by the Camera component if needed
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
			processLayout.setSuccess('Processing...');

			if (!photoData) {
				processLayout.setError('Please take a photo of the truck.');
				isSubmitting = false;
				return;
			}

			// Estimate photo size (base64 is ~33% larger than the actual file)
			const estimatedSizeInMB = (photoData.length * 0.75) / (1024 * 1024);
			console.log(`Estimated photo size: ${estimatedSizeInMB.toFixed(2)} MB`);
			
			// Check if truck exists in Pocketbase DB
			processLayout.setSuccess('Verifying truck information...');
			const trucks = (await indexedDBService.getAllRecords('trucks')).find(
				truck => truck.registration.toLowerCase() === selectedTruck.toLowerCase()
			);

			if (!trucks) {
				processLayout.setError('Truck not found. Please select a valid truck.');
				isSubmitting = false;
				return;
			}

			// Update Truck Arrival data
			processLayout.setSuccess('Finding truck arrival record...');
			const allTruckArrivals = await indexedDBService.getAllRecords('truckArrivals');
			
			const filteredArrivals = allTruckArrivals.filter(
				arrival => arrival.truckId === trucks.serverId && !arrival.port_truck_arrival_timestamp && arrival.status !== 'received'
			);
			
			if (!filteredArrivals.length) {
				processLayout.setError('No matching truck arrivals found for this registration.');
				isSubmitting = false;
				return;
			}
			
			const truckArrival = filteredArrivals[0];

			// Define status with proper type
			const status: 'received' | 'registered' = 'received';
			
			// Save to IndexedDB using the generic saveRecord method
			processLayout.setSuccess('Saving data...');
			
			const updatedData = {
				...truckArrival,
				syncStatus: 'pending',
				port_truck_arrival_timestamp: new Date(),
				status,
				truck_photo: photoData
			};
			
			console.log('Updating record with ID:', truckArrival.id);
			await indexedDBService.updateRecord('truckArrivals', truckArrival.id, updatedData);
			
			// Try to sync right away (don't wait for response)
			try {
				console.log('Attempting to sync right away');
				processLayout.setSuccess('Synchronizing data...');
				syncService.syncTruckArrival({
					...updatedData,
					id: truckArrival.id,
					status
				})
					.then(() => console.log('Sync successful'))
					.catch(err => console.error('Sync error (will try again later):', err));
			} catch (syncError) {
				console.log('Initial sync attempt failed (will retry later):', syncError);
			}
			
			// Show success before navigation
			processLayout.setSuccess('Truck arrival recorded successfully!');
			console.log('Navigating to verification page with ID:', truckArrival.id);
			
			// Small delay before navigation to ensure IndexedDB update completes
			setTimeout(() => {
				goto('/bosveld/processes/truck-arrival/verification?truckArrivalId=' + truckArrival.id);
			}, 500);
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
	</div>
</ProcessLayout>

<style>
	.form {
		margin-top: 1rem;
		position: relative;
	}
</style>
