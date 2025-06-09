<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay, Truck } from '$lib/types';
	import type { TruckLoad } from '$lib/types/truckLoad';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import TruckRegistration from '$lib/components/TruckRegistration.svelte';
	import { CheckCircle, TruckIcon } from 'lucide-svelte';
	import YesNo from '$lib/components/YesNo.svelte';
	import { Button } from '$lib/components/ui/button';
	import FormField from '$lib/components/FormField.svelte';
	import { createProcessStepStore, createStepStore } from '$lib/stores/processStepStore';
	import ProcessStepForm from '$lib/components/ProcessStepForm.svelte';
	import type { FormErrors, ProcessStepData } from '$lib/services/processStepManager';
	import { derived } from 'svelte/store';

	// Create process step store
	const processStore = createProcessStepStore('gravelotte', '/pmc/processes/gravelotte');
	
	// Set current step to 1 (second step)
	processStore.manager.currentStep.set(1);
	
	// Create step store for truck form
	const truckFormStore = createStepStore(processStore, 1);

	let assayId = $page.url.searchParams.get('assayId') || '';
	let assay: Assay | undefined;
	let linkedTrucks: any[] = [];
	let error = '';
	let isLoading = true;
	let truckLoads: TruckLoad[] = [];
	let trucks: Truck[] = [];
	let addTruck = false;
	let message = '';
	
	// Form fields
	let selectedTruck: string;
	let samplingStatus: string = '';
	let felWeight: string | undefined;
	let loadingLocation: any = 'Gravelotte';
	let loadingHour: string;
	
	// Options
	const loadingLocations = ['West Load Out', 'East Load Out', 'Gravelotte', 'TLO'];
	
	// Load data
	async function loadAssayData() {
		try {
			const assayData = await indexedDBService.getRecord('assays', assayId);
			if (!assayData) {
				error = 'Assay not found';
				return;
			}
			assay = assayData;

			// Load truck loads if assay has linked loads
			if (assay.linkedTruckLoadIds?.length) {
				const loads = await Promise.all(
					assay.linkedTruckLoadIds.map((id) => indexedDBService.getRecord('truckLoads', id))
				);
				truckLoads = loads.filter((load): load is TruckLoad => load !== undefined);
			}

			trucks = await indexedDBService.getAllRecords('trucks');
			
			// Update process store with assay data
			processStore.manager.updateData({
				assayId: assay.id,
				assayName: assay.name,
				assaySampleSize: assay.sampleSize,
				assayCommodity: assay.commodity,
				assayProductType: assay.productType,
				assayDedicatedFleet: assay.dedicatedFleet,
				truckLoads
			});
		} catch (err) {
			error = 'Failed to load data';
			console.error(err);
		} finally {
			isLoading = false;
		}
	}
	
	// Load data when assayId changes
	$: if (assayId) {
		loadAssayData();
	}
	
	// Computed properties
	$: hasTrucks = assay?.linkedTruckLoadIds?.length > 0 || false;
	
	// Validate truck form
	function validateTruckForm(data: ProcessStepData): FormErrors | null {
		const errors: FormErrors = {};
		
		if (!data.selectedTruck) {
			errors.selectedTruck = 'Please select a truck';
		}
		
		if (!data.samplingStatus) {
			errors.samplingStatus = 'Please select sampling status';
		}
		
		if (!data.felWeight) {
			errors.felWeight = 'FEL Weight is required';
		}
		
		if (!data.loadingLocation) {
			errors.loadingLocation = 'Loading Location is required';
		}
		
		if (data.assayDedicatedFleet && !data.loadingHour) {
			errors.loadingHour = 'Loading Hour is required for dedicated fleet';
		}
		
		if (data.assayDedicatedFleet && data.loadingHour) {
			const hour = parseInt(data.loadingHour);
			if (isNaN(hour) || hour < 0 || hour > 23) {
				errors.loadingHour = 'Loading hour must be between 00 and 23';
			}
		}
		
		return Object.keys(errors).length > 0 ? errors : null;
	}
	
	// Handle new truck button click
	function handleNewTruck() {
		if (!assay) return;
		addTruck = true;
		
		// Update form data
		processStore.manager.updateData({
			selectedTruck,
			samplingStatus,
			felWeight,
			loadingLocation,
			loadingHour
		});
	}
	
	// Handle truck form cancel
	function handleTruckCancel() {
		addTruck = false;
	}
	
	// Handle add truck form submission
	async function handleAddTruck(event: CustomEvent<{ data: ProcessStepData }>) {
		try {
			if (!assay) return;
			
			const data = event.detail.data;
			
			// Create truck load object
			const truckLoad: TruckLoad = {
				id: crypto.randomUUID(),
				assayId: assay.id,
				truckId: data.selectedTruck,
				felWeight: data.felWeight,
				samplingStatus: data.samplingStatus === 'Yes',
				loadingLocation: data.loadingLocation,
				loadingHour: data.loadingHour,
				syncStatus: 'pending',
				created: new Date().toISOString(),
				updated: new Date().toISOString()
			};
			
			// Save truck load to IndexedDB
			await indexedDBService.saveRecord('truckLoads', truckLoad);
			
			// Update assay with linked truck load
			const linkedTruckLoadIds = assay.linkedTruckLoadIds || [];
			linkedTruckLoadIds.push(truckLoad.id);
			
			assay = {
				...assay,
				linkedTruckLoadIds,
				updated: new Date().toISOString()
			};
			
			// Save updated assay
			await indexedDBService.saveRecord('assays', assay);
			
			// Update truck loads array
			truckLoads = [...truckLoads, truckLoad];
			
			// Update process store
			processStore.manager.updateData({
				truckLoads
			});
			
			// Reset form
			addTruck = false;
			selectedTruck = '';
			felWeight = undefined;
			samplingStatus = '';
			loadingLocation = 'Gravelotte';
			loadingHour = '';
		} catch (err) {
			error = 'Failed to add truck';
			console.error(err);
		}
	}
	
	// Handle process completion
	function handleSubmit() {
		message = 'Loading Completed Successfully';
		processStore.manager.completeProcess(); // Clear saved data
		
		setTimeout(() => {
			goto('/pmc/processes');
		}, 2500);
	}
	
	// Handle cancel
	function handleCancel() {
		processStore.manager.cancelProcess(false); // Don't clear saved data
		history.back();
	}
	
	// Format date helper
	function formatDate(dateString: string | undefined) {
		if (!dateString) return '';
		return new Date(dateString).toLocaleString();
	}
</script>

{#if message}
	<div class="bg-green-600 text-white border rounded-lg shadow-lg flex p-4" style="background: #91f1b5;color: #2f3c33;">
		<CheckCircle class="mr-4"/> {message}
	</div>
{:else}
	<ProcessLayout 
		steps={processStore.stepNames}
		currentStep={$processStore.currentStep + 1} <!-- Add 1 because ProcessLayout is 1-indexed -->
		on:cancel={handleCancel}
		on:submit={handleSubmit}
		showSubmit={hasTrucks}
		isSubmitting={processStore.isSubmitting}
	>
		<div class="container">
			<h1 class="text-2xl font-black ease-in">Adding Trucks to a Lot</h1>

			{#if error}
				<div class="error">{error}</div>
			{/if}

			{#if isLoading}
				<div class="text-center">Loading...</div>
			{:else if assay}
				<div class="sampling-details">
					<h2 class="text-xl mb-4">Sampling Details</h2>
					<div class="details-grid rounded-lg border bg-gray-50 p-4 shadow-lg inset-boxshadow-sm">
						<div class="detail-item">
							<label>Total Trucks Linked</label>
							<span class="value">{truckLoads.length}</span>
						</div>
						<div class="detail-item">
							<label>Sample Batch Created</label>
							<span class="value">{formatDate(assay.created)}</span>
						</div>
						<div class="detail-item">
							<label>Dedicated Fleet</label>
							<span class="value">{assay.dedicatedFleet ? 'Yes' : 'No'}</span>
						</div>
						<div class="detail-item">
							<label>Sample ID</label>
							<span class="value">{assay.name}</span>
						</div>
						<div class="detail-item">
							<label>Sample Size</label>
							<span class="value">{assay.sampleSize}</span>
						</div>
						<div class="detail-item">
							<label>Commodity</label>
							<span class="value">{assay.commodity}</span>
						</div>
						<div class="detail-item">
							<label>Product Type</label>
							<span class="value">{assay.productType}</span>
						</div>
					</div>
				</div>
				
				{#if truckLoads.length > 0}
					<div class="truck-loads my-4">
						<h2 class="font-bold">Linked Trucks ({truckLoads.length})</h2>
						<div class="loads-grid">
							{#each truckLoads as load}
								<div
									class="load-card flex flex-col items-center justify-between rounded-lg border bg-white p-4 shadow mt-4"
								>
									<div class="load-detail flex w-full justify-between">
										<label>Truck Registration</label>
										<span>{trucks.find((t) => load.truckId?.includes(t.id))?.registration}</span>
									</div>
									<div class="load-detail flex w-full justify-between">
										<label>FEL Weight</label>
										<span>{load.felWeight} kg</span>
									</div>
									<div class="load-detail flex w-full justify-between">
										<label>Sample Status</label>
										<span>{load.samplingStatus ? 'Yes' : 'No'}</span>
									</div>
									<div class="load-detail flex w-full justify-between">
										<label>Loading Location</label>
										<span>{load.loadingLocation}</span>
									</div>
									<div class="load-detail flex w-full justify-between">
										<label>Loading Hour</label>
										<span>{load.loadingHour}</span>
									</div>
									<div class="load-detail flex w-full justify-between">
										<label>Created</label>
										<span>{formatDate(load.created)}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
				
				{#if !addTruck}
					<Button class="w-full mt-4" on:click={handleNewTruck}>
						Add Truck &nbsp; <TruckIcon size="18" />
					</Button>
				{/if}
			{/if}
			
			{#if addTruck}
				<div class="add-truck-form rounded border border-1 p-4 space-y-4 mt-4">
					<h5 class="text-center text-2xl font-bold">Enter Truck Details</h5>
					
					<ProcessStepForm 
						store={truckFormStore} 
						stepIndex={1}
						showNext={false}
						showSubmit={true}
						submitLabel="Submit Truck"
						previousLabel="Cancel"
						on:previous={handleTruckCancel}
						on:submit={handleAddTruck}
						validator={validateTruckForm}
					>
						<TruckRegistration 
							availableTrucks={trucks} 
							allowInput={false} 
							bind:selectedValue={selectedTruck} 
						/>

						<FormField
							id="felWeight"
							label="FEL Weight (kg)"
							type="number"
							bind:value={felWeight}
							placeholder="Enter FEL Weight"
							required
						/>
						
						<YesNo 
							bind:selected={samplingStatus} 
							label="Sampling Status" 
						/>

						<FormField
							id="loadingLocation"
							label="Loading Location"
							bind:value={loadingLocation}
							isSelect={true}
							options={loadingLocations.map((location) => ({ value: location, label: location }))}
							required
						/>
						
						{#if assay?.dedicatedFleet}
							<FormField
								id="loadingHour"
								label="Loading Hour (00-23)"
								type="text"
								bind:value={loadingHour}
								maxlength="2"
								pattern="[0-9]*"
								placeholder="Enter hour (00-23)"
								required
							/>
						{/if}
					</ProcessStepForm>
				</div>
			{/if}
		</div>
	</ProcessLayout>
{/if}

<style>
	.detail-item {
		margin-bottom: 8px;
		display: flex;
		line-height: 1;
		font-size: 14px;
	}
	.detail-item label {
		flex: 1;
	}
</style>
