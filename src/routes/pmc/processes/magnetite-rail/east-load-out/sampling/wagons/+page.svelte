<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { formPersistenceService } from '$lib/services/formPersistenceService';
	import type { Assay } from '$lib/types/assay';
	import { syncService } from '$lib/services/syncService';
	import { page } from '$app/stores';
	import { pocketbaseService } from '$lib/services/pocketbaseService';
	import QRPrinting from '$lib/components/QRPrinting.svelte';
	import WagonCreate from '$lib/components/WagonCreate.svelte';
	import type { ShuntingTrain } from '$lib/types/shuntingTrain';
	import type { Wagon } from '$lib/types';
	import { Pencil } from 'lucide-svelte';

	let sampleId = '';
	let trainNumber = '';
	let wagonIdSimple = $page.url.searchParams.get('wagonIdSimple') || '';
	let shuntingTrainIdsParam = $page.url.searchParams.get('shuntingTrainIds') || '';
	let shuntingTrainIds = shuntingTrainIdsParam ? shuntingTrainIdsParam.split(',') : [];
	let linkedWagonIdsParam = $page.url.searchParams.get('wagonIds') || '';
	let linkedWagonIds = linkedWagonIdsParam ? linkedWagonIdsParam.split(',') : [];

	let productGrade = localStorage.getItem('productGrade') || '';
	let loadingLocation = 'East Load Out';
	let isSubmitting = false;
	let currentStep = 2;

	let selectedWagonId = '';
	let selectedWagon = '';
	let availableWagons: any[] = [];
	let editingWagon: any = null;
	let showCreateWagonInput = false;
	let shuntingTrains: ShuntingTrain[] = [];

	// Process steps
	const processSteps = ['Arrival Train', 'Wagon Sampling', 'Verification'];

	// Reference to the ProcessLayout component
	let processLayout: ProcessLayout;

	function formatTimestamp(date: Date) {
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		const dd = String(date.getDate()).padStart(2, '0');
		const hh = String(date.getHours()).padStart(2, '0');
		const min = String(date.getMinutes()).padStart(2, '0');
		return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
	}

	function handleCancel() {
		if (wagonIdSimple !== '') {
			goto(`/pmc/processes/magnetite-rail/east-load-out/sampling/wagons/review?shuntingTrainIds=${shuntingTrainIds.join(',')}&wagonIds=${linkedWagonIds.join(',')}`);
		} else {
			goto('/pmc/processes/magnetite-rail/east-load-out/sampling');
		}
	}
	// Form errors
	let formErrors = {
		sampleId: '',
		productGrade: '',
		selectedWagon: '',
		trainNumber: ''
	};

	async function fetchData() {
		// Only fetch data if wagonIdSimple is provided and not empty
		if (!wagonIdSimple) return;
		
		const wagon = (await indexedDBService.getAllRecords('wagons')).find(
			(w) => w.wagonIdSimple === wagonIdSimple
		);

		if (wagon) {
			editingWagon = wagon;
			selectedWagon = wagon.wagonIdSimple || '';
			productGrade = wagon.productType || '';
			trainNumber = wagon.trainNumber || '';
		}
	}

	$: if (selectedWagonId) {
		selectedWagon = availableWagons.find(wagon => wagon.wagonId === selectedWagonId)?.wagonIdSimple || '';
	}

	$: {
		const currentDate = new Date();
		const YYMMDD = `${currentDate.getFullYear().toString().slice(-2)}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;
		const productCode = {
			'Iron Oxide': 'IOX',
			'Magnetite-DMS': 'DMS',
			'Magnetite 62%': 'MAG62',
			'Magnetite 65%': 'MAG65'
		}[productGrade];
		sampleId = `${YYMMDD}${selectedWagon ? `_${selectedWagon}` : ''}${trainNumber ? `_${trainNumber}` : ''}${productCode ? `_${productCode}` : ''}`;
	}

	const productGrades = ['Iron Oxide', 'Magnetite-DMS', 'Magnetite 62%', 'Magnetite 65%'];

	const loadingLocations = ['East Load Out', 'West Load Out', 'Bosveld'];

	// Save form data when component is unmounted
	onMount(() => {
		loadPersistedData();
		return () => {
			if (sampleId || productGrade) {
				formPersistenceService.saveForm('east_loadout', {
					productGrade,
					loadingLocation
				});
			}
		};
	});

	function validateForm() {
		let isValid = true;
		formErrors = {
			sampleId: '',
			productGrade: '',
			selectedWagon: '',
			trainNumber: ''
		};

		if (!sampleId) {
			formErrors.sampleId = 'Sample ID is required';
			isValid = false;
		}

		if (!productGrade) {
			formErrors.productGrade = 'Product grade is required';
			isValid = false;
		}

		if (!selectedWagon) {
			formErrors.selectedWagon = 'Wagon ID is required';
			isValid = false;
		}

		if (!trainNumber) {
			formErrors.trainNumber = 'Train number is required';
			isValid = false;
		}

		return isValid;
	}

	let existingIdsArray: string[] = [];
	$: existingIdsArray = ($page.url.searchParams.get('wagonIdSimple') || '').split(',').filter(Boolean);

	onMount(async () => {
		availableWagons = (await indexedDBService.getAllRecords('wagons')).filter(
			(w: any) => linkedWagonIds.includes(w.serverId) && !w.sampleTimestamp
		).sort((a, b) => (a.wagonIdSimple || '').localeCompare(b.wagonIdSimple || ''));
		if (wagonIdSimple) await fetchData();
		const allShunting = await indexedDBService.getAllRecords('shuntingTrains');
		shuntingTrains = allShunting.filter((t: any) => shuntingTrainIds.includes(t.serverId));
	});

	function loadPersistedData() {
		const savedData = formPersistenceService.loadForm<{
			loadingLocation: string;
		}>('east_loadout');

		if (savedData) {
			loadingLocation = savedData.loadingLocation || 'East Load Out';
		}
	}

	async function handleSubmit() {
		if (!validateForm()) {
			return;
		}
		try {
			isSubmitting = true;
			processLayout.setError('');
			processLayout.setSuccess('');

			if (wagonIdSimple && editingWagon) {
				// Edit mode — update the existing wagon
				await indexedDBService.updateRecord('wagons', editingWagon.id, {
					...editingWagon,
					wagonIdSimple: selectedWagon,
					productType: productGrade,
					trainNumber,
					loadingLocation,
					sampleId,
					syncStatus: 'pending',
					updated: formatTimestamp(new Date()),
					isWireSynced: false
				});

				// Update the linked assay if one exists
				const wagonIdToUse = editingWagon.serverId || editingWagon.id;
				const allAssays = await indexedDBService.getAllRecords('assays');
				const matchingAssay = allAssays.find((a: any) => a.linkedWagonIds?.includes(wagonIdToUse));
				if (matchingAssay) {
					await indexedDBService.updateRecord('assays', matchingAssay.id, {
						...matchingAssay,
						name: sampleId,
						sampleId,
						productType: productGrade,
						location: loadingLocation,
						syncStatus: 'pending',
						updated: new Date().toISOString(),
						isWireSynced: false
					});
				}

				formPersistenceService.clearForm('east_loadout');
				processLayout.setSuccess('Data updated successfully');
				setTimeout(() => {
					goto(
						`/pmc/processes/magnetite-rail/east-load-out/sampling/wagons/review?shuntingTrainIds=${shuntingTrainIds.join(',')}&wagonIds=${linkedWagonIds.join(',')}`
					);
				}, 1000);
			} else if (selectedWagonId) {
				let wagon = (availableWagons).find(
					(w) => w.wagonId === selectedWagonId
				);

				if (!wagon) {
					processLayout.setError('Wagon not found');
					return;
				}

				wagon.productType = productGrade;
				wagon.trainNumber = trainNumber;
				wagon.loadingLocation = loadingLocation;
				wagon.sampleId = sampleId;
				wagon.syncStatus = 'pending';
				wagon.sampleTimestamp = new Date();
				wagon.updated = formatTimestamp(new Date());
				wagon.isWireSynced = false;

				await indexedDBService.updateRecord('wagons', wagon.id, wagon);

				const assay: Assay = {
					id: crypto.randomUUID(),
					name: sampleId,
					sampleId: sampleId,
					productType: productGrade,
					location: loadingLocation,
					created: new Date(),
					updated: new Date().toISOString(),
					linkedWagonIds: [wagon?.serverId || ''],
					syncStatus: 'pending',
					user: pocketbaseService.currentUser?.id || '',
					siteLocation: 'PMC',
					isWireSynced: false,
				};

				await indexedDBService.saveRecord('assays', assay);
				await syncService.syncAssay(assay);

				formPersistenceService.clearForm('east_loadout');
				processLayout.setSuccess('Data saved successfully');
				setTimeout(() => {
					goto(
						`/pmc/processes/magnetite-rail/east-load-out/sampling/wagons/review?shuntingTrainIds=${shuntingTrainIds.join(',')}&wagonIds=${linkedWagonIds.join(',')}`
					);
				}, 1000);
			}
		} catch (err) {
			processLayout.setError('Failed to save assay data');
			console.error(err);
		} finally {
			isSubmitting = false;
		}
	}

	async function handleCreateSubmit(e: CustomEvent<{ wagon: Wagon; shuntingTrainId?: string }>) {
		showCreateWagonInput = false;
		const { wagon, shuntingTrainId } = e.detail ?? {};
		if (!wagon) return;

		const wagonIdToUse = wagon.serverId || wagon.id;

		await indexedDBService.updateRecord('wagons', wagon.id, {
			sampleTimestamp: new Date(),
			syncStatus: 'pending',
			isWireSynced: false
		});

		const assay: Assay = {
			id: crypto.randomUUID(),
			name: wagon.sampleId || '',
			sampleId: wagon.sampleId || '',
			productType: wagon.productType || '',
			location: wagon.loadingLocation || '',
			created: new Date(),
			updated: new Date().toISOString(),
			linkedWagonIds: [wagonIdToUse],
			syncStatus: 'pending',
			user: pocketbaseService.currentUser?.id || '',
			siteLocation: 'PMC',
			isWireSynced: false
		};
		await indexedDBService.saveRecord('assays', assay);
		await syncService.syncAssay(assay);

		if (shuntingTrainId) {
			const allShunting = await indexedDBService.getAllRecords('shuntingTrains');
			const train = allShunting.find(
				(t: any) => t.serverId === shuntingTrainId || t.id === shuntingTrainId
			);
			if (train) {
				await indexedDBService.updateRecord('shuntingTrains', train.id, {
					linkedWagons: [...(train.linkedWagons || []), wagonIdToUse],
					syncStatus: 'pending'
				});
			}
		}

		if (!linkedWagonIds.includes(wagonIdToUse)) {
			linkedWagonIds = [...linkedWagonIds, wagonIdToUse];
		}
		goto(`/pmc/processes/magnetite-rail/east-load-out/sampling/wagons/review?shuntingTrainIds=${shuntingTrainIds.join(',')}&wagonIds=${linkedWagonIds.join(',')}`);
	}

	function handleCreateCancel() {
		showCreateWagonInput = false;
	}
</script>

<ProcessLayout
	title="Sample Details"
	steps={processSteps}
	{currentStep}
	{isSubmitting}
	bind:this={processLayout}
	cancelPath={wagonIdSimple
		? `/pmc/processes/magnetite-rail/east-load-out/sampling/wagons/review?shuntingTrainIds=${shuntingTrainIds.join(',')}&wagonIds=${linkedWagonIds.join(',')}`
		: '/pmc/processes/magnetite-rail/east-load-out/sampling'}
	on:submit={handleSubmit}
	on:cancel={handleCancel}
>
	<div slot="header">
		<h5 class="text-xl font-bold ">Sample Details Capturing</h5>
		<p class="text-sm text-gay">Please enter the sample and product details</p>
	</div>
		
	{#if wagonIdSimple}
		<div class="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-700 shadow-sm">
			<div class="flex items-start gap-3">
				<Pencil size={16} class="mt-0.5 shrink-0 text-sky-600" />
				<div class="min-w-0">
					<div class="text-sm font-medium text-sky-900">
						<span class="font-semibold tracking-wide text-sky-700">Editing wagon:</span> {wagonIdSimple}
					</div>
				</div>
			</div>
		</div>
	{/if}
<div class="container">
	<div class="form">
		{#if wagonIdSimple === ''}
			<FormField
				id="wagonId"
				label="Wagon ID"
				search={true}
				options={availableWagons.map(wagon => ({value: wagon.wagonId, label: wagon.wagonIdSimple}))}
				bind:value={selectedWagonId}
				placeholder="Select Wagon ID"
				required
			/>
		{:else}
			<FormField
				id="wagonId"
				label="Wagon ID"
				bind:value={selectedWagon}
				placeholder="Enter Wagon ID"
				required
			/>
		{/if}
	</div>	
	<div class="form">
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
	<div class="form">	
		<FormField 
			id="trainNumber"
			label="Train Number"
			bind:value={trainNumber}
			required={true}
			placeholder="Enter Train Number"
			error={formErrors.trainNumber}
		/>
	</div>		
	<div class="form">	
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
	<div class="form">	
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
<QRPrinting {sampleId}/>
<div class="mt-6">
	<button
		type="button"
		class="bg-gray w-full rounded-md py-3 text-sm text-white hover:bg-blue-700"
		on:click={() => { showCreateWagonInput = true; }}
	>Create Wagon</button>
</div>
</ProcessLayout>

{#if showCreateWagonInput}
	<div
		class="bg-opacity-40 fixed inset-0 z-10 flex items-center justify-center backdrop-blur-sm"
		role="button"
		tabindex="0"
		on:click|self={handleCreateCancel}
		on:keydown={(e) => e.key === 'Escape' && handleCreateCancel()}
	>
		<div class="m-6 w-full max-w-xs overflow-y-auto max-h-[90vh] rounded-lg bg-white p-6 shadow-xl">
			<WagonCreate
				wagonPosition={linkedWagonIds.length + 1}
				siteLocation={'PMC'}
				defaultLoadingLocation="East Load Out"
				isSampling={true}
				{shuntingTrains}
				on:submit={handleCreateSubmit}
				on:cancel={handleCreateCancel}
			/>
		</div>
	</div>
{/if}


<style>
	.container {
		max-width: 600px;
		margin: 0 auto;
	}
	.form {
		margin-top: 1rem;
		position: relative;
	}
</style>
