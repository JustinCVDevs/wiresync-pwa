<script lang="ts">
import { createEventDispatcher } from 'svelte';
import type { Wagon } from '$lib/types/wagon';
import { indexedDBService } from '$lib/services/indexedDBService';
import { syncService } from '$lib/services/syncService';
import { pocketbaseService } from '$lib/services/pocketbaseService';
import FormField from './FormField.svelte';
import DoubleConfirmField from '$lib/components/DoubleConfirmField.svelte';

export let wagonPosition: number = 0;

let wagonIdSimple = '';
let wagonId = '';
let wagonConfirmId = '';
let productGrade = '';
let trainNumber = '';
let loadingLocation = 'West Load Out';
let sampleId = '';
let isSubmitting = false;
let hasAttemptedSubmit = false;
let showWagonIdError = false;

// Form errors
let formErrors = {
	sampleId: '',
	productGrade: '',
	wagonIdSimple: '',
	wagonConfirmId: '',
	trainNumber: ''
};

const dispatch = createEventDispatcher<{ submit: { wagon: Wagon }; cancel: void }>();

const productGrades = ['Iron Oxide', 'Magnetite-DMS', 'Magnetite 62%', 'Magnetite 65%'];
const loadingLocations = ['East Load Out', 'West Load Out', 'Bosveld'];

function validateForm() {
	let isValid = true;
	formErrors = {
		sampleId: '',
		productGrade: '',
		wagonIdSimple: '',
		wagonConfirmId: '',
		trainNumber: ''
	};

	if (!wagonIdSimple) {
		formErrors.wagonIdSimple = 'Wagon ID is required';
		isValid = false;
	}
	if (!wagonConfirmId) {
		formErrors.wagonConfirmId = 'Wagon Confirm ID is required';
		isValid = false;
	}
	if (wagonIdSimple !== wagonConfirmId) {
		formErrors.wagonIdSimple = 'Wagon IDs do not match';
		isValid = false;
	}
	if (!productGrade) {
		formErrors.productGrade = 'Product grade is required';
		isValid = false;
	}
	if (!trainNumber) {
		formErrors.trainNumber = 'Train number is required';
		isValid = false;
	}
	if (!sampleId) {
		formErrors.sampleId = 'Sample ID is required';
		isValid = false;
	}
	return isValid;
}

// Generate sampleId reactively
$: {
	const currentDate = new Date();
	const YYMMDD = `${currentDate.getFullYear().toString().slice(-2)}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;
	const productCode = {
		'Iron Oxide': 'IOX',
		'Magnetite-DMS': 'DMS',
		'Magnetite 62%': 'MAG62',
		'Magnetite 65%': 'MAG65'
	}[productGrade];
	sampleId = `${YYMMDD}${wagonIdSimple ? `_${wagonIdSimple}` : ''}${trainNumber ? `_${trainNumber}` : ''}${productCode ? `_${productCode}` : ''}`;
	wagonId = `${YYMMDD}_MANUAL_WAGON_${wagonIdSimple}`;
}

async function handleSubmit(e?: Event) {
	if (e) {
		e.preventDefault();
		e.stopPropagation();
	}

	hasAttemptedSubmit = true;
	showWagonIdError = true;
	
	formErrors = {
		sampleId: '',
		productGrade: '',
		wagonIdSimple: '',
		wagonConfirmId: '',
		trainNumber: ''
	};

	// Check if values match before proceeding
	if (wagonIdSimple !== wagonConfirmId) {
		formErrors.wagonIdSimple = 'Wagon IDs do not match';
		wagonIdSimple = '';
		wagonConfirmId = '';
		showWagonIdError = true;
		return; // Stop submission process
	}

	showWagonIdError = false;

	if (validateForm()) {
		isSubmitting = true;
		try {
			const wagon: Wagon = {
				id: crypto.randomUUID(),
				wagonId: wagonId,
				wagonIdSimple: wagonIdSimple,
				productType: productGrade,
				trainNumber,
				loadingLocation,
				sampleId,
				syncStatus: 'pending',
				manualCreated: true,
				user: pocketbaseService.currentUser?.id || '',
				created: new Date(),
				updated: new Date().toISOString(),
				isWireSynced: false,
				wagonDispatchPosition: wagonPosition
			};
			await indexedDBService.saveRecord('wagons', wagon);
			await syncService.syncWagon(wagon);
			dispatch('submit', { wagon });
		} catch (err) {
			formErrors.sampleId = 'Failed to create wagon';
			console.error(err);
		} finally {
			isSubmitting = false;
		}
	}
}

function handleCancel(e?: Event) {
	if (e) {
		e.preventDefault();
		e.stopPropagation();
	}
	dispatch('cancel');
}
</script>

<div>
	<h5 class="text-xl font-bold text-gray">Wagon Details</h5>
	<p class="text-gray-500">Enter the wagon's information.</p>
</div>

<div class="container">
	<div class="form">
		<DoubleConfirmField
			label="Wagon ID"
			bind:value1={wagonIdSimple}
			bind:value2={wagonConfirmId}
			error={showWagonIdError && hasAttemptedSubmit ? formErrors.wagonIdSimple : ''}
			on:field2focus={() => {
				showWagonIdError = false;
			}}
		/>
	</div>
	<div class="form pt-2">
		<FormField
			id="productGrade"
			label="Product Selection"
			bind:value={productGrade}
			placeholder="Select Product Grade"
			isSelect={true}
			options={productGrades.map((grade) => ({ value: grade, label: grade }))}
			required={true}
			error={formErrors.productGrade}
		/>
	</div>
	<div class="form pt-2">
		<FormField
			id="trainNumber"
			label="Train Number"
			bind:value={trainNumber}
			required={true}
			placeholder="Enter Train Number"
			error={formErrors.trainNumber}
		/>
	</div>
	<div class="form pt-2">
		<FormField
			id="loadingLocation"
			label="Loading Location"
			bind:value={loadingLocation}
			placeholder="Select Loading Location"
			isSelect={true}
			options={loadingLocations.map((location) => ({ value: location, label: location }))}
			required={true}
		/>
	</div>
	<div class="form pt-2">
		<FormField
			id="sampleId"
			label="Sample ID"
			bind:value={sampleId}
			placeholder="Enter Sample ID"
			required={true}
			error={formErrors.sampleId}
		/>
	</div>
</div>


<div class="flex items-center justify-between pt-8">
	<button
		type="button"
		class="bg-red w-36 rounded-lg px-2 py-3 text-sm text-white transition hover:bg-red-700 active:bg-red-800 disabled:opacity-50"
		on:click={handleCancel}
		disabled={isSubmitting}
	>
		Cancel
	</button>
	<button
		type="button"
		on:click={handleSubmit}
		class="bg-gray w-36 items-center justify-center rounded-lg px-2 py-3 text-sm text-white transition hover:bg-green-700 active:bg-black disabled:opacity-50"
		disabled={isSubmitting}
	>
		Create Wagon
	</button>
</div>

<style>
	.form {
		position: relative;
		flex: 1;
	}
</style>