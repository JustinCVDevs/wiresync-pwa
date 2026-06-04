<script lang="ts">
import { createEventDispatcher } from 'svelte';
import type { Wagon } from '$lib/types/wagon';
import type { ShuntingTrain } from '$lib/types/shuntingTrain';
import { indexedDBService } from '$lib/services/indexedDBService';
import { syncService } from '$lib/services/syncService';
import { pocketbaseService } from '$lib/services/pocketbaseService';
import FormField from './FormField.svelte';
import DoubleConfirmField from '$lib/components/DoubleConfirmField.svelte';

export let wagonPosition: number = 0;
export let siteLocation: string = '';
export let isSampling: boolean = false;
export let shuntingTrains: ShuntingTrain[] = [];
export let defaultLoadingLocation: string;

let wagonIdSimple = '';
let wagonId = '';
let wagonConfirmId = '';
let productGrade = '';
let trainNumber = '';
let loadingLocation = defaultLoadingLocation;
let sampleId = '';
let selectedShuntingTrainId = '';
let isSubmitting = false;
let hasAttemptedSubmit = false;
let showWagonIdError = false;

// Form errors
let formErrors = {
	sampleId: '',
	productGrade: '',
	wagonIdSimple: '',
	wagonConfirmId: '',
	trainNumber: '',
	shuntingTrain: ''
};

const dispatch = createEventDispatcher<{ submit: { wagon: Wagon; shuntingTrainId?: string }; cancel: void }>();

function formatTrainDate(date: Date | string | undefined): string {
	if (!date) return 'Unknown date';
	return new Date(date).toLocaleString('en-GB', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});
}

const productGrades = ['Iron Oxide', 'Magnetite-DMS', 'Magnetite 62%', 'Magnetite 65%'];
const loadingLocations = ['East Load Out', 'West Load Out', 'Bosveld'];

function validateForm() {
	let isValid = true;
	formErrors = {
		sampleId: '',
		productGrade: '',
		wagonIdSimple: '',
		wagonConfirmId: '',
		trainNumber: '',
		shuntingTrain: ''
	};

	if (isSampling && shuntingTrains.length > 0 && !selectedShuntingTrainId) {
		formErrors.shuntingTrain = 'Please select a shunting train';
		isValid = false;
	}
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
	if (isSampling && !productGrade) {
		formErrors.productGrade = 'Product grade is required';
		isValid = false;
	}
	if (isSampling && !trainNumber) {
		formErrors.trainNumber = 'Train number is required';
		isValid = false;
	}
	if (isSampling && !sampleId) {
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
		trainNumber: '',
		shuntingTrain: ''
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
			if (isSampling)
			{
				const wagon: Wagon = {
					id: crypto.randomUUID(),
					wagonId: wagonId,
					wagonIdSimple: wagonIdSimple,
					productType: productGrade,
					siteLocation: siteLocation,
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
				dispatch('submit', { wagon, shuntingTrainId: selectedShuntingTrainId || undefined });
			}
			else {
				const wagon: Wagon = {
					id: crypto.randomUUID(),
					wagonId: wagonId,
					wagonIdSimple: wagonIdSimple,
					siteLocation: siteLocation,
					syncStatus: 'pending',
					dispatchTimestamp: new Date(),
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
			}
			
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
	{#if isSampling}
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
				disabled={true}
			/>
		</div>

		<div class="form pt-2">
			<label for="shuntingTrainSelect" class="mb-1 block text-sm font-medium text-gray-700">
				Shunting Train <span class="text-red-500">*</span>
			</label>
			<select
				id="shuntingTrainSelect"
				bind:value={selectedShuntingTrainId}
				class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
			>
				<option value="">-- Select a shunting train --</option>
				{#each shuntingTrains as train}
					<option value={train.serverId ?? train.id}>
						{formatTrainDate(train.postDate)}
					</option>
				{/each}
			</select>
			{#if formErrors.shuntingTrain}
				<p class="mt-1 text-xs text-red-500">{formErrors.shuntingTrain}</p>
			{/if}
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
	{/if}	
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