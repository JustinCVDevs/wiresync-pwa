<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { TruckArrival } from '$lib/types/truckArrival';
	import type { Truck } from '$lib/types/truck';

	let truckRegistration = '';
	let portArrivalSampleId = '';
	let date = '';
	let haulier = '';
	let product = '';
	let grossMass = '';
	let grossTimestamp = '';
	let tareMass = '';
	let tareTimestamp = '';
	let sender = '';
	let isSubmitting = false;
	let currentStep = 1;

	// Process steps
	const processSteps = ['Truck Registration'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	// Form errors
	let formErrors = {
		truckRegistration: '',
		date: '',
		haulier: '',
		product: '',
		grossMass: '',
		grossTimestamp: '',
		tareMass: '',
		tareTimestamp: '',
		sender: ''
	};

	// Sender options
	const senderOptions = [
		{ value: 'TLG', label: 'TLG' },
		{ value: 'RCL', label: 'RCL' },
		{ value: 'BOP', label: 'BOP' }
	];

	onMount(async () => {
		// Get data from URL params
		const urlParams = new URLSearchParams($page.url.search);
		truckRegistration = urlParams.get('truckRegistration') || '';
		portArrivalSampleId = urlParams.get('portArrivalSampleId') || '';
		
		// Set current date as default
		date = new Date().toISOString().split('T')[0];
	});

	function validateForm() {
		let isValid = true;
		formErrors = {
			truckRegistration: '',
			date: '',
			haulier: '',
			product: '',
			grossMass: '',
			grossTimestamp: '',
			tareMass: '',
			tareTimestamp: '',
			sender: ''
		};

		if (!truckRegistration) {
			formErrors.truckRegistration = 'Vehicle registration is required';
			isValid = false;
		}

		if (!date) {
			formErrors.date = 'Date is required';
			isValid = false;
		}

		if (!haulier) {
			formErrors.haulier = 'Haulier is required';
			isValid = false;
		}

		if (!product) {
			formErrors.product = 'Product is required';
			isValid = false;
		}

		if (!grossMass) {
			formErrors.grossMass = 'Gross mass is required';
			isValid = false;
		} else if (isNaN(Number(grossMass)) || Number(grossMass) <= 0) {
			formErrors.grossMass = 'Gross mass must be a valid positive number';
			isValid = false;
		}

		if (!grossTimestamp) {
			formErrors.grossTimestamp = 'Gross timestamp is required';
			isValid = false;
		}

		if (!tareMass) {
			formErrors.tareMass = 'Tare mass is required';
			isValid = false;
		} else if (isNaN(Number(tareMass)) || Number(tareMass) <= 0) {
			formErrors.tareMass = 'Tare mass must be a valid positive number';
			isValid = false;
		}

		if (!tareTimestamp) {
			formErrors.tareTimestamp = 'Tare timestamp is required';
			isValid = false;
		}

		if (!sender) {
			formErrors.sender = 'Sender is required';
			isValid = false;
		}

		return isValid;
	}

	async function handleSubmit() {
		if (!validateForm()) {
			return;
		}

		try {
			isSubmitting = true;
			processLayout.setError('');
			processLayout.setSuccess('');

			// Create a new truck record first
			const newTruck: Truck = {
				id: crypto.randomUUID(),
				registration: truckRegistration,
				syncStatus: 'pending',
				serverId: '',
				created: new Date(),
				updated: new Date().toISOString()
			};

			// Save the truck record
			await indexedDBService.saveRecord('trucks', newTruck);

			// Create truck arrival record with all the manual data
			const truckArrival: TruckArrival = {
				id: crypto.randomUUID(),
				truckId: newTruck.id,
				port_arrival_sample_id: portArrivalSampleId,
				truck_photo: [], // Will be handled separately if needed
				port_truck_arrival_timestamp: new Date(date).toISOString(),
				status: 'registered',
				transporter: haulier,
				truck_commodity: product,
				gross_measured_kg: Number(grossMass),
				gross_timestamp: new Date(grossTimestamp).toISOString(),
				tare_stored_kg: Number(tareMass),
				tare_timestamp: new Date(tareTimestamp).toISOString(),
				truck_origin_location: sender as 'TLG' | 'RCL' | 'BOP',
				created: new Date(),
				updated: new Date().toISOString(),
				syncStatus: 'pending'
			};

			// Save truck arrival record
			await indexedDBService.saveRecord('truckArrivals', truckArrival);

			processLayout.setSuccess('Truck registered successfully');
			setTimeout(() => {
				goto('/richardsbay/processes');
			}, 1500);
		} catch (err) {
			processLayout.setError('Failed to register truck');
			console.error(err);
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/richardsbay/processes/truck-arrival/verification');
	}

	$: isFormValid = truckRegistration && date && haulier && product && grossMass && grossTimestamp && tareMass && tareTimestamp && sender;
</script>

<ProcessLayout
	title="Truck Registration"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	cancelPath="/richardsbay/processes/truck-arrival/verification"
	bind:this={processLayout}
	on:submit={handleSubmit}
	on:cancel={handleCancel}
>
	<div slot="header">
		<h5 class="text-xl font-bold text-gray">Truck Registration</h5>
		<p class="text-sm text-gray-600">
			Step 1: Registration Scanning &nbsp;&nbsp;&nbsp; Step 2: Truck Registration
		</p>
	</div>

	<div class="space-y-4">
		<div class="bg-white rounded-lg border border-gray-200 p-6">
			<h6 class="text-lg font-semibold text-gray-800 mb-4">Enter Truck Data</h6>
			<p class="text-sm text-gray-600 mb-6">Please enter truck registration data below</p>

			<div class="space-y-4">
				<!-- Date -->
				<FormField
					id="date"
					label="Date:"
					bind:value={date}
					type="date"
					required={true}
					error={formErrors.date}
				/>

				<!-- Vehicle Registration -->
				<FormField
					id="truckRegistration"
					label="Vehicle Registration:"
					bind:value={truckRegistration}
					placeholder="Enter vehicle registration"
					required={true}
					error={formErrors.truckRegistration}
					disabled={true}
				/>

				<!-- Haulier -->
				<FormField
					id="haulier"
					label="Haulier:"
					bind:value={haulier}
					placeholder="Enter haulier"
					required={true}
					error={formErrors.haulier}
				/>

				<!-- Product -->
				<FormField
					id="product"
					label="Product:"
					bind:value={product}
					placeholder="Enter product"
					required={true}
					error={formErrors.product}
				/>

				<!-- Gross mass -->
				<FormField
					id="grossMass"
					label="Gross mass:"
					bind:value={grossMass}
					placeholder="Enter gross mass (kg)"
					type="number"
					required={true}
					error={formErrors.grossMass}
				/>

				<!-- Gross time -->
				<FormField
					id="grossTimestamp"
					label="Gross time:"
					bind:value={grossTimestamp}
					type="datetime-local"
					required={true}
					error={formErrors.grossTimestamp}
				/>

				<!-- Tare mass -->
				<FormField
					id="tareMass"
					label="Tare mass:"
					bind:value={tareMass}
					placeholder="Enter tare mass (kg)"
					type="number"
					required={true}
					error={formErrors.tareMass}
				/>

				<!-- Tare time -->
				<FormField
					id="tareTimestamp"
					label="Tare time:"
					bind:value={tareTimestamp}
					type="datetime-local"
					required={true}
					error={formErrors.tareTimestamp}
				/>

				<!-- Sender -->
				<FormField
					id="sender"
					label="Sender:"
					bind:value={sender}
					isSelect={true}
					options={senderOptions}
					placeholder="Select sender"
					required={true}
					error={formErrors.sender}
				/>
			</div>

			<!-- Register Button -->
			<div class="mt-6">
				<button
					type="button"
					class="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					on:click={handleSubmit}
					disabled={!isFormValid || isSubmitting}
				>
					{#if isSubmitting}
						Registering Truck...
					{:else}
						Register Truck
					{/if}
				</button>
			</div>
		</div>
	</div>
</ProcessLayout>

<style>
	.space-y-4 > * + * {
		margin-top: 1rem;
	}
</style>