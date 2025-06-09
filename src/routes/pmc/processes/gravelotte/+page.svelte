<script lang="ts">
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay } from '$lib/types';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import YesNo from '$lib/components/YesNo.svelte';
	import { onMount } from 'svelte';
	import { createProcessStepStore } from '$lib/stores/processStepStore';
	import ProcessStepForm from '$lib/components/ProcessStepForm.svelte';
	import type { FormErrors, ProcessStepData } from '$lib/services/processStepManager';

	// Create process step store for gravelotte process
	const processStore = createProcessStepStore('gravelotte', '/pmc/processes/gravelotte');
	
	// Form fields
	let name = '';
	let sampleSize = '';
	let commodity = '';
	let productType = '';
	let dedicatedFleet = '';
	let isLoading = false;
	let error = '';
	
	// Options
	const commodityOptions = ['Magnetite', 'Chrome', 'Platinum', 'Palladium'];
	const productTypeOptions = ['Lumpy', 'Fine', 'Ultra Fine'];
	
	// Load saved data on mount
	onMount(() => {
		let savedData: ProcessStepData = {};
		const unsubscribe = processStore.data.subscribe(value => { savedData = value; });
		
		if (savedData) {
			name = savedData.name || '';
			sampleSize = savedData.sampleSize || '';
			commodity = savedData.commodity || '';
			productType = savedData.productType || '';
			dedicatedFleet = savedData.dedicatedFleet || '';
		}
		
		unsubscribe();
	});
	
	// Update store data when form fields change
	$: {
		processStore.manager.updateData({
			name,
			sampleSize,
			commodity,
			productType,
			dedicatedFleet
		});
	}
	
	// Validate step 1
	function validateStep1(data: ProcessStepData): FormErrors | null {
		const errors: FormErrors = {};
		
		if (!data.name) {
			errors.name = 'Sample ID is required';
		}
		
		if (!data.sampleSize) {
			errors.sampleSize = 'Sample Size is required';
		}
		
		if (!data.commodity) {
			errors.commodity = 'Commodity is required';
		}
		
		if (data.commodity === 'Magnetite' && !data.productType) {
			errors.productType = 'Product Type is required for Magnetite';
		}
		
		if (!data.dedicatedFleet) {
			errors.dedicatedFleet = 'Dedicated Fleet selection is required';
		}
		
		return Object.keys(errors).length > 0 ? errors : null;
	}
	
	// Register validator with store
	processStore.manager.registerValidator(0, validateStep1);
	
	// Handle form submission
	async function handleSubmit(event: CustomEvent<{ data: ProcessStepData }>) {
		try {
			isLoading = true;
			const data = event.detail.data;
			
			// Create assay object
			const assay: Assay = {
				id: crypto.randomUUID(),
				name: data.name,
				sampleSize: data.sampleSize,
				commodity: data.commodity,
				productType: data.commodity === 'Magnetite' ? data.productType : undefined,
				dedicatedFleet: data.dedicatedFleet === 'Yes',
				process: 'Gravelotte',
				syncStatus: 'pending',
				created: new Date().toISOString(),
				updated: new Date().toISOString()
			};
			
			// Save assay to IndexedDB
			await indexedDBService.saveRecord('assays', assay);
			
			// Update store with assay ID
			processStore.manager.updateData({ assayId: assay.id });
			
			// Navigate to next step
			goto(`/pmc/processes/gravelotte/add-trucks?assayId=${assay.id}`);
		} catch (err) {
			error = 'Failed to save assay data';
			console.error(err);
		} finally {
			isLoading = false;
		}
	}
	
	// Handle cancel
	function handleCancel() {
		processStore.manager.cancelProcess(true); // Clear saved data
		history.back();
	}
</script>

<ProcessLayout 
	steps={$processStore.stepNames}
	currentStep={$processStore.currentStep + 1} <!-- Add 1 because ProcessLayout is 1-indexed -->
	on:cancel={handleCancel}
	showSubmit={false}
	isSubmitting={isLoading}
>
	<div class="container">
		<h1 class="text-2xl font-black ease-in">Create New Gravelotte Sample</h1>
		
		{#if error}
			<div class="error">{error}</div>
		{/if}
		
		<ProcessStepForm 
			store={processStore} 
			stepIndex={0}
			on:submit={handleSubmit}
		>
			<FormField
				id="name"
				label="Sample ID"
				bind:value={name}
				placeholder="Enter Sample ID"
				required
				error={$processStore.errors?.name}
			/>
			
			<FormField
				id="sampleSize"
				label="Sample Size"
				bind:value={sampleSize}
				placeholder="Enter Sample Size"
				required
				error={$processStore.errors?.sampleSize}
			/>
			
			<FormField
				id="commodity"
				label="Commodity"
				bind:value={commodity}
				isSelect={true}
				options={commodityOptions.map((option) => ({ value: option, label: option }))}
				required
				error={$processStore.errors?.commodity}
			/>
			
			{#if commodity === 'Magnetite'}
				<FormField
					id="productType"
					label="Product Type"
					bind:value={productType}
					isSelect={true}
					options={productTypeOptions.map((option) => ({ value: option, label: option }))}
					required
					error={$processStore.errors?.productType}
				/>
			{/if}
			
			<YesNo 
				bind:selected={dedicatedFleet} 
				label="Dedicated Fleet" 
				error={$processStore.errors?.dedicatedFleet}
			/>
		</ProcessStepForm>
	</div>
</ProcessLayout>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 1rem;
	}
	
	.error {
		color: red;
		margin-bottom: 1rem;
	}
</style>
