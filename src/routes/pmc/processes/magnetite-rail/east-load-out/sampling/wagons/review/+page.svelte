<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { syncService } from '$lib/services/syncService';
	import { pocketbaseService } from '$lib/services/pocketbaseService';
	import type { Wagon } from '$lib/types';
	import type { ShuntingTrain } from '$lib/types/shuntingTrain';
	import type { Assay } from '$lib/types/assay';
	import { Container } from 'lucide-svelte';
	import NoMoreWagons from '$lib/components/NoMoreWagons.svelte';
	import QRPrinting from '$lib/components/QRPrinting.svelte';
	import { Pencil } from 'lucide-svelte';
	import WagonCreate from '$lib/components/WagonCreate.svelte';

	let shuntingTrainIdsParam = $page.url.searchParams.get('shuntingTrainIds') || '';
	let shuntingTrainIds = shuntingTrainIdsParam ? shuntingTrainIdsParam.split(',') : [];
	let wagonIdsParam = $page.url.searchParams.get('wagonIds') || '';
	let linkedWagonIds = wagonIdsParam ? wagonIdsParam.split(',') : [];
	let wagons: Wagon[] = [];
	let filteredWagons: Wagon[] = [];
	let error = '';
	let success = '';
	let isLoading = true;
	let processLayout: ProcessLayout;
	let showNoMoreWagons = false;
	let showCreateWagonInput = false;
	let shuntingTrains: ShuntingTrain[] = [];

	const steps = ['Arrival Train', 'Wagon Sampling', 'Verification'];
	let currentStep = 3;

	function formatTimestamp(date: Date) {
		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		const dd = String(date.getDate()).padStart(2, '0');
		const hh = String(date.getHours()).padStart(2, '0');
		const min = String(date.getMinutes()).padStart(2, '0');
		return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
	}

	async function loadWagons() {
		isLoading = true;
		try {
			const allWagons = await indexedDBService.getAllRecords('wagons');
			filteredWagons = allWagons.filter(
				(w: any) =>
					(linkedWagonIds.includes(w.serverId) || linkedWagonIds.includes(w.id)) &&
					w.sampleTimestamp
			).sort((a, b) => (a.wagonIdSimple || '').localeCompare(b.wagonIdSimple || ''));
		} catch (e) {
			console.error(e);
			error = 'Failed to load wagon data';
		} finally {
			isLoading = false;
		}
	}

	onMount(async () => {
		await loadWagons();
		const allShunting = await indexedDBService.getAllRecords('shuntingTrains');
		shuntingTrains = allShunting.filter((t: any) => shuntingTrainIds.includes(t.serverId));
	});

	async function handleSampleWagon() {
		const allWagons = await indexedDBService.getAllRecords('wagons');
		const unsampledWagons = allWagons.filter(
			(w: any) => linkedWagonIds.includes(w.serverId) && !w.sampleTimestamp
		);

		if (unsampledWagons.length === 0) {
			showNoMoreWagons = true;
		} else {
			goto(`/pmc/processes/magnetite-rail/east-load-out/sampling/wagons?shuntingTrainIds=${shuntingTrainIds.join(',')}&wagonIds=${linkedWagonIds.join(',')}`);
		}
	}

	function handleCancel() {
		goto('/pmc/processes/magnetite-rail/east-load-out/sampling');
	}

	async function handleSubmit() {
		processLayout.setSuccess('Wagons Successfully Sampled!');

		setTimeout(() => {
			goto('/pmc/processes/magnetite-rail/east-load-out/sampling');
		}, 1000);
	}

	async function handleCreateSubmit(e: CustomEvent<{ wagon: Wagon; shuntingTrainId?: string }>) {
		showCreateWagonInput = false;
		const { wagon, shuntingTrainId } = e.detail ?? {};
		if (!wagon) return;

		const wagonIdToUse = wagon.serverId || wagon.id;

		// Mark wagon as sampled
		await indexedDBService.updateRecord('wagons', wagon.id, {
			sampleTimestamp: new Date(),
			syncStatus: 'pending',
			isWireSynced: false
		});

		// Create assay
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

		// Link wagon to the selected shunting train
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

		// Add to local pool and update URL
		if (!linkedWagonIds.includes(wagonIdToUse)) {
			linkedWagonIds = [...linkedWagonIds, wagonIdToUse];
			const url = new URL($page.url);
			url.searchParams.set('wagonIds', linkedWagonIds.join(','));
			goto(`${url.pathname}${url.search}`, { replaceState: true, noScroll: true, keepFocus: true });
		}

		await loadWagons();
	}

	function handleCreateCancel() {
		showCreateWagonInput = false;
	}

</script>

<ProcessLayout
	title="Shunting Train - Review"
	{steps}
	{currentStep}
	isSubmitting={isLoading}
	cancelPath="/pmc/processes/magnetite-rail/east-load-out/sampling"
	bind:this={processLayout}
	on:cancel={handleCancel}
	on:submit={handleSubmit}
>
	<div class="mb-4">
		<h5 class="text-xl font-bold text-gray">Review & Complete</h5>
		<p class="text-sm text-gray">
			Review the entered data and complete the train sampling
		</p>
	</div>

	{#if error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{error}
		</div>
	{/if}

	{#if success}
		<div class="mb-4 rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
			{success}
		</div>
	{/if}

	{#if isLoading}
		<div class="text-center">Loading...</div>
	{:else}
		<!-- Linked Wagons -->
		<div class="mb-6">
			<div class="mb-4 flex items-center justify-between">
				<button
					type="button"
					class="bg-gray mb-1 ml-1 w-full rounded-md py-3 text-sm text-white hover:bg-blue-700"
					on:click={handleSampleWagon}
				>Sample Wagon</button>
				<button
					type="button"
					class="bg-gray mb-1 ml-1 w-full rounded-md py-3 text-sm text-white hover:bg-blue-700"
					on:click={() => {
						showCreateWagonInput = true;
					}}
					>Create Wagon
				</button>
			</div>

			<p class="text-sm text-gray">Sampled Wagons: <span class="font-bold">{filteredWagons.length}</span></p>

			{#if filteredWagons.length > 0}
				<div class="space-y-3">
					{#each filteredWagons as wagon}
						<div class="flex flex-col">
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								class="flex items-center gap-3 rounded bg-white px-3 py-2 shadow-sm cursor-pointer"
								on:click={() => goto(`/pmc/processes/magnetite-rail/east-load-out/sampling/wagons?wagonIdSimple=${wagon.wagonIdSimple}&shuntingTrainIds=${shuntingTrainIds.join(',')}&wagonIds=${linkedWagonIds.join(',')}`)}
							>
								<Container size={16} class="inline text-xs" />
								<div class="flex-1">
									<div class="font-medium text-gray">
										<span class="text-sm font-light">Wagon ID:</span> {wagon.wagonIdSimple}
									</div>
									<div class="font-medium text-gray">
										<span class="text-sm font-light">Sample ID: </span>
										{wagon.sampleId ? wagon.sampleId : 'Not set'}
									</div>
								</div>
								<Pencil size={16} class="text-blue-500 mb-14" />
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-center text-gray-500">No wagons added yet</p>
			{/if}
		</div>
	{/if}
</ProcessLayout>

{#if showNoMoreWagons}
	<NoMoreWagons process="sampling" on:ok={() => (showNoMoreWagons = false)} />
{/if}

{#if showCreateWagonInput}
	<div
		class="bg-opacity-40 fixed inset-0 z-10 flex items-center justify-center backdrop-blur-sm"
		role="button"
		tabindex="0"
		on:click|self={() => (showCreateWagonInput = false)}
		on:keydown={(e) => e.key === 'Escape' && (showCreateWagonInput = false)}
	>
		<div class="m-6 w-full max-w-xs rounded-lg bg-white p-6 shadow-xl">
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
