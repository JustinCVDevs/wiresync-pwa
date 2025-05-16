<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { syncService } from '$lib/services/syncService';
	import type { Wagon } from '$lib/types/wagon';
	import type { Assay } from '$lib/types/assay';
	import { SamplingStatusEnum } from '$lib/types/enums';
	import WagonInput from '$lib/components/WagonInput.svelte';
	import RfidReader from '$lib/components/RFIDReader.svelte';

	const sampleId = $page.url.searchParams.get('sampleId') || '';
	let assay: Assay | null = null;
	let currentStep = 2;
	$:  isSubmitting = false;
	
	// Process steps
	const processSteps = ['Sample Details', 'FEL Weight Capturing', 'Complete'];
	
	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	// Wagon details
	let wagonId = '';
	let wagonWeight = '';
	let samplingStatus = SamplingStatusEnum.No;

	// Form errors
	let formErrors = {
		wagonId: '',
		wagonWeight: '',
		samplingStatus: ''
	};

	const samplingStatusOptions = [
		{ value: SamplingStatusEnum.Yes, label: 'Yes' },
		{ value: SamplingStatusEnum.No, label: 'No' }
	];

	onMount(async () => {
		await loadAssayData();
	});

	async function loadAssayData() {
		if (sampleId) {
			assay = await indexedDBService.getAssayById(sampleId);
		}
	}

	function validateForm() {
		let isValid = true;
		formErrors = {
			wagonId: '',
			wagonWeight: '',
			samplingStatus: ''
		};

		if (!wagonId) {
			formErrors.wagonId = 'Wagon ID is required';
			isValid = false;
		}

		if (!wagonWeight) {
			formErrors.wagonWeight = 'Wagon Weight is required';
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
			
			// Create wagon object according to Wagon interface
			const wagon: Wagon = {
				id: crypto.randomUUID(),
				wagonIdSimple: wagonId,
				created: new Date().toISOString(),
				updated: new Date().toISOString(),
				weight: wagonWeight,
				samplingStatus: samplingStatus,
				syncStatus: 'pending',
				process: 'West Loadout'
			};

			// Save wagon to IndexedDB
			await indexedDBService.saveRecord('wagons', wagon);
			await syncService.syncWagon(wagon);

			// Update assay to link the wagon
			if (assay) {
				const updatedAssay: Assay = {
					...assay,
					linkedWagonIds: [...(assay.linkedWagonIds || []), wagon.id],
					updated: new Date().toISOString(),
					syncStatus: 'pending' 
				};
				await indexedDBService.saveRecord('assays', updatedAssay);
				await syncService.syncAssay(updatedAssay);
			}
			
			processLayout.setSuccess('Wagon data saved successfully');
			setTimeout(() => {
				// Navigate to wagon review page
				goto(`/pmc/processes/west-loadout/wagon-review?sampleId=${sampleId}`);
			}, 1000);
		} catch (err) {
			processLayout.setError('Failed to save wagon data');
			console.error(err);
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto(`/pmc/processes/west-loadout/verification?sampleId=${sampleId}`);
	}
</script>

<ProcessLayout
	title="Sample Details Verification"
	processKey="west_loadout"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	bind:this={processLayout}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
<!-- process form errors-->
	{#if formErrors.wagonId || formErrors.wagonWeight || formErrors.samplingStatus}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
			<strong class="font-bold">Error:</strong>
			<span class="block sm:inline">{formErrors.wagonId}</span>
			<span class="block sm:inline">{formErrors.wagonWeight}</span>
			<span class="block sm:inline">{formErrors.samplingStatus}</span>
			<span class="absolute top-0 bottom-0 right-0 px-4 py-3">
				</span></div>
				{/if}
	<div slot="header">
		<h5 class="text-xl font-bold ">FEL Weight Capturing</h5>
		<p class="text-sm text-gay">Please enter the wagon details and weight</p>
	</div>

	<div class="space-y-4">
		{#if assay}
			<div class="bg-white p-4 rounded-lg shadow-sm mb-4">
				<h6 class="text-lg font-semibold mb-2">Transaction Details</h6>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<p class="text-sm text-gray-500">Sample ID</p>
						<p class="font-medium">{assay.name}</p>
					</div>
					<div>
						<p class="text-sm text-gray-500">Product Grade</p>
						<p class="font-medium">{assay.productGrade}</p>
					</div>
				</div>
			</div>

			<div class="bg-white p-4 rounded-lg shadow-sm">
				<h6 class="text-lg font-semibold mb-2">Wagon Details & FEL</h6>
				
					<div class="space-y-1">
						<RfidReader
							onScan={(tagId) => (wagonId = tagId)}
							defaultValue={wagonId}
							targetFieldId={wagonId}
							label="Please Scan Tag or Enter Wagon ID Manually"
						/>
						{#if formErrors.wagonId}
							<p class="text-sm text-red-600">{formErrors.wagonWeight}</p>
						{/if}
					</div>

				<div class="mt-4">
					<FormField
						id="wagonWeight"
						label="Wagon Weight (kg)"
						bind:value={wagonWeight}
						placeholder="Enter wagon weight"
						required={true}
						error={formErrors.wagonWeight}
						type="number"
					/>
				</div>

				<div class="mt-4">
					<p class="font-medium mb-2">Wagon Sampling Status:</p>
					<div class="flex space-x-4">
						{#each samplingStatusOptions as option}
						<div class="flex space-x-4">
							<label class="flex items-center block  border border-1 p-4 px-5 rounded {(samplingStatus === option.value) ? "bg-gray text-white" : ""}">
								<input type="radio" hidden name="samplingStatus" value={option.value} class="mr-2"  checked={samplingStatus === option.value}
								on:change={() => samplingStatus = option.value}/>
								<span>{option.label}</span>
							</label>
						</div>
							
						{/each}
					</div>
				</div>
			</div>
		{:else}
			<div class="text-center py-8">
				<p class="text-gray-500">Loading sample details...</p>
			</div>
		{/if}
	</div>

	<div class="flex justify-between mt-6">
		<button 
			type="button"
			class="bg-red hover:bg-red-600  text-sm text-white py-2 px-6 rounded-md"
			on:click={handleCancel}
		>
			Cancel Wagon 
		</button>
		
		<button 
			type="submit"
			class="bg-gray text-sm hover:bg-green-700 text-white  py-2 px-6 rounded-md"
			disabled={isSubmitting}
		>
			{isSubmitting ? 'Submitting...' : 'Submit Wagon'}
		</button>
	</div>
</ProcessLayout>