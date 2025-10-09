<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
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
	let availableTruckArrivals: TruckArrival[] = [];
	let filteredTruckArrivals: TruckArrival[] = [];
	let selectedTruckRegistration: string = '';

	// Process steps
	const processSteps = ['Registration', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	onMount(async () => {
		// Fetch all truck arrivals that haven't been processed yet
		availableTruckArrivals = (await indexedDBService.getAllRecords('truckArrivals')).filter(
			arrival => !arrival.port_truck_arrival_timestamp && arrival.siteLocation === 'BOP' && arrival.registration
		);
	});

	$: {
		if (selectedTruckRegistration) {
			if (filteredTruckArrivals.length > 0) {
				matchFound = filteredTruckArrivals.some(arrival => arrival.registration?.toLowerCase() === selectedTruckRegistration.toLowerCase());
			}
		}
	}

	$: {
		filteredTruckArrivals = availableTruckArrivals.filter(arrival =>
			arrival.registration?.toLowerCase().includes(selectedTruckRegistration?.toLowerCase() ?? '')
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

			// Check if truck arrival exists in the database
			const truckArrival = (await indexedDBService.getAllRecords('truckArrivals')).find(
				arrival => arrival.registration?.toLowerCase() === selectedTruckRegistration.toLowerCase()
			);

			if (!truckArrival) {
				goto('/richardsbay/processes/road/bop-truck-arrivals/register?truckRegistration=' + selectedTruckRegistration);
				return;
			}

			if (!photoData) {
				processLayout.setError('Please take a photo of the truck.');
				return;
			}

			// Update Truck Arrival data
			await indexedDBService.updateRecord('truckArrivals', truckArrival.id, {
					...truckArrival,
					syncStatus: 'pending',
					port_truck_arrival_timestamp: new Date(),
					status: 'received',
					truck_photo: photoData
				});

			goto('/richardsbay/processes/road/bop-truck-arrivals/verification?truckArrivalId=' + truckArrival.id);
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
	title="BOP Truck Arrival"
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
				id="truckArrivalName"
				label="Truck Arrival Name"
				search={true}
				options={filteredTruckArrivals.map(arrival => ({ value: arrival.name || '', label: arrival.name || '' }))}
				bind:value={selectedTruckRegistration}
				placeholder="Select Truck Arrival"
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
