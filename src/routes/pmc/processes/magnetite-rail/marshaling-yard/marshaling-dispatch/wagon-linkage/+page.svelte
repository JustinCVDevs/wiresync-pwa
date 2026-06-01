<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import WagonInput from '$lib/components/WagonInput.svelte';
	import WagonCreate from '$lib/components/WagonCreate.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import type { TrainDispatch } from '$lib/types/trainDispatch';
	import type { Consignment, Train, Wagon } from '$lib';
	import { Repeat  } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';

	let dispatchId = '';
	$: dispatchId = $page.url.searchParams.get('dispatchId') || '';

	let trainDispatch: TrainDispatch | undefined;
	let showWagonInput = false;
	let showCreateWagonInput = false;
	let showSwapWagonInput = false;
	let swapTargetWagon: Wagon | null = null;
	let error = '';
	let success = '';
	let isLoading = true;
	let processLayout: ProcessLayout;
	let tarpedStatus = false;

	const steps = ['Train & Consignment', 'Wagon Linkage'];
	let currentStep = 2;
	let train: Train | undefined;
	let consignment: Consignment | undefined;
	let wagons: Wagon[] | undefined;
	let showPopup = false;
	const wagonsPerPage = 10;
	$: linkedWagonIds = trainDispatch?.linkedWagonIds ?? [];
	$: {
		const parsedWagonPage = Number($page.url.searchParams.get('wagonPage') || '1');
		wagonPage = Number.isFinite(parsedWagonPage) ? Math.max(1, parsedWagonPage) : 1;
	}
	$: wagonPageCount = Math.max(1, Math.ceil(linkedWagonIds.length / wagonsPerPage));
	$: safeWagonPage = Math.min(wagonPage, wagonPageCount);
	$: paginatedLinkedWagonIds = linkedWagonIds.slice((safeWagonPage - 1) * wagonsPerPage, safeWagonPage * wagonsPerPage);
	$: wagonPageStart = linkedWagonIds.length === 0 ? 0 : (safeWagonPage - 1) * wagonsPerPage + 1;
	$: wagonPageEnd = Math.min(safeWagonPage * wagonsPerPage, linkedWagonIds.length);
	let wagonPage = 1;

	function setWagonPage(nextPage: number) {
		const url = new URL($page.url);
		const targetPage = Math.max(1, Math.min(nextPage, wagonPageCount));

		if (targetPage === 1) {
			url.searchParams.delete('wagonPage');
		} else {
			url.searchParams.set('wagonPage', String(targetPage));
		}

		goto(`${url.pathname}${url.search}${url.hash}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	$: if (wagonPage > wagonPageCount && linkedWagonIds.length > 0) {
		setWagonPage(wagonPageCount);
	}

	async function loadDispatch() {
		isLoading = true;
		try {
			const record = (await indexedDBService.getAllRecords('trainDispatches')).find(
				(d) => d.id === dispatchId || d.serverId === dispatchId
			);
			if (!record) {
				error = 'Train dispatch not found';
				isLoading = false;
				return;
			}
			trainDispatch = record;
			
			if (trainDispatch !== undefined && trainDispatch != null) {
				train = (await indexedDBService.getTrains()).find(
					(t) => trainDispatch?.linkedTrainId === t.id || trainDispatch?.linkedTrainId === t.serverId
				);
				consignment = (await indexedDBService.getAllRecords('consignments')).find(
					(t) => trainDispatch?.linkedConsignmentId === t.id || trainDispatch?.linkedConsignmentId === t.serverId
				);
				
				// Improved wagon matching - check both id and serverId
				const allWagons = await indexedDBService.getAllRecords('wagons');
				wagons = allWagons.filter(
					(w) => trainDispatch?.linkedWagonIds?.some(linkedId => 
						linkedId === w.id || linkedId === w.serverId
					)
				);
			}
		} catch (e) {
			console.error('Error loading dispatch:', e);
			error = `Failed to load dispatch data: ${e instanceof Error ? e.message : 'Unknown error'}`;
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		if (dispatchId) {
			loadDispatch();
		} else {
			error = 'No dispatch ID provided';
			isLoading = false;
		}
	});

	async function handleWagonSubmit(e: CustomEvent<{ wagonIds: string[] }>) {
		// Accepts { wagonIds: string[] }
		if (!trainDispatch || !trainDispatch.linkedWagonIds) {
			console.error('Train dispatch not initialized:', trainDispatch);
			error = 'Train dispatch not initialized';
			return;
		}
		error = '';
		success = '';

		const { wagonIds } = e.detail;
		if (!wagonIds || wagonIds.length === 0) {
			error = 'No wagons selected';
			return;
		}

		try {
			const allWagons = await indexedDBService.getAllRecords('wagons');
			let updatedIds = [...trainDispatch.linkedWagonIds];
			let addedCount = 0;

			for (const wagonId of wagonIds) {				
				// Find the wagon by id or serverId
				const wagon = allWagons.find((w) => w.id === wagonId || w.serverId === wagonId);
				if (!wagon) {
					continue; // skip if not found
				}
				const wagonIdToUse = wagon.serverId || wagon.id;
				if (updatedIds.includes(wagonIdToUse)) {
					continue; // skip if already linked
				}
				// Update wagon and trainDispatch in atomic transaction
				await indexedDBService.atomicUpdate(['wagons', 'trainDispatches'], async (tx) => {
					const existingWagon = await tx.objectStore('wagons').get(wagon.id);
					if (!existingWagon) throw new Error('Wagon not found in transaction');
					await tx.objectStore('wagons').put({
						...existingWagon,
						dispatchTimestamp: new Date(),
						isWireSynced: false
					});
					const existingDispatch = await tx.objectStore('trainDispatches').get(trainDispatch!.id);
					if (!existingDispatch) throw new Error('Train dispatch not found in transaction');
					await tx.objectStore('trainDispatches').put({
						...existingDispatch,
						linkedWagonIds: [...updatedIds, wagonIdToUse],
						isWireSynced: false
					});
				});
				await indexedDBService.updateRecord('wagons', wagon.id, { syncStatus: 'pending', wagonDispatchPosition: updatedIds.length + 1 });
				updatedIds.push(wagonIdToUse);
				addedCount++;
			}

			await indexedDBService.updateRecord('trainDispatches', trainDispatch.id, { syncStatus: 'pending' });
			trainDispatch = {
				...trainDispatch,
				linkedWagonIds: updatedIds
			};
			success = addedCount > 0 ? `${addedCount} wagon(s) linked successfully` : 'No new wagons linked';
			currentStep = 3;
			await loadDispatch();
			showWagonInput = false;
		} catch (e) {
			console.error('Error updating wagons:', e);
			error = `Failed to update wagons: ${e instanceof Error ? e.message : 'Unknown error'}`;
		}
	}

	async function confirmFinishDispatch(confirm: boolean) {
		if (confirm) {
			if (!trainDispatch) {
				error = 'Train dispatch not found';
				return;
			}

			// 1. Update trainDispatch with dispatchTimestamp
			await indexedDBService.updateRecord('trainDispatches', trainDispatch.id, {
				...trainDispatch,
				syncStatus: 'pending',
				dispatchTimestamp: new Date(),
				isWireSynced: false
			});

			// 2. Update each linked wagon's tarpedStatus and dispatchTimestamp
			if (trainDispatch.linkedWagonIds && trainDispatch.linkedWagonIds.length > 0) {
				const allWagons = await indexedDBService.getAllRecords('wagons');
				for (const wagonId of trainDispatch.linkedWagonIds) {
					const wagon = allWagons.find((w) => w.id === wagonId || w.serverId === wagonId);
					if (wagon) {
						await indexedDBService.updateRecord('wagons', wagon.id, {
							...wagon,
							syncStatus: 'pending',
							tarpedStatus: wagon.tarpedStatus,
							dispatchTimestamp: new Date(),
							isWireSynced: false
						});
					}
				}
			}

			processLayout.setSuccess('Wagon linkage completed');
			setTimeout(() => {
				goto(`/pmc/processes/magnetite-rail/marshaling-yard/marshaling-dispatch`);
			}, 1000);
		}
		showPopup = false;
	}

	function handleWagonCancel() {
		showWagonInput = false;
	}

	async function handleCreateSubmit(e: CustomEvent<{ wagon: Wagon }>) {
		showCreateWagonInput = false;
		const wagon = e.detail?.wagon;
		if (!wagon || !trainDispatch) return;

		const wagonIdToUse = wagon.serverId || wagon.id;
		let updatedIds = trainDispatch.linkedWagonIds ? [...trainDispatch.linkedWagonIds] : [];
		if (!updatedIds.includes(wagonIdToUse)) {
			updatedIds.push(wagonIdToUse);
			await indexedDBService.updateRecord('wagons', wagon.id, {
				dispatchTimestamp: new Date(),
				wagonDispatchPosition: updatedIds.length,
				syncStatus: 'pending',
				isWireSynced: false
			});
			await indexedDBService.updateRecord('trainDispatches', trainDispatch.id, {
				...trainDispatch,
				linkedWagonIds: updatedIds,
				syncStatus: 'pending',
				isWireSynced: false
			});
			trainDispatch = { ...trainDispatch, linkedWagonIds: updatedIds };
			await loadDispatch();
		}
	}
	
	function handleCreateCancel() {
		showCreateWagonInput = false;
	}

	function handleReview() {
		processLayout.setSuccess('Wagon linkage completed');
		setTimeout(() => {
			goto(`/pmc/processes/magnetite-rail/marshaling-yard/marshaling-dispatch`);
		}, 1000);
	}

	function handleWagonSwap(wagon?: Wagon) {
		if (!wagon) return;
		swapTargetWagon = wagon;
		error = '';
		success = '';
		showSwapWagonInput = true;
	}

	function handleSwapCancel() {
		showSwapWagonInput = false;
		swapTargetWagon = null;
	}

	async function handleSwapSubmit(e: CustomEvent<{ wagonIds: string[] }>) {
		if (!trainDispatch || !swapTargetWagon) {
			error = 'Swap target not initialized';
			return;
		}

		const { wagonIds } = e.detail;
		if (!wagonIds || wagonIds.length !== 1) {
			error = 'Select exactly one wagon to swap with';
			return;
		}

		try {
			const allWagons = await indexedDBService.getAllRecords('wagons');
			const newWagon = allWagons.find((w) => w.id === wagonIds[0] || w.serverId === wagonIds[0]);
			if (!newWagon) {
				error = 'Selected wagon was not found';
				return;
			}

			const targetLinkedId = swapTargetWagon.serverId || swapTargetWagon.id;
			const newWagonLinkedId = newWagon.serverId || newWagon.id;
			if (targetLinkedId === newWagonLinkedId) {
				error = 'Select a different wagon';
				return;
			}

			const targetIndex = trainDispatch.linkedWagonIds?.findIndex((id) => id === targetLinkedId) ?? -1;
			const targetPosition = swapTargetWagon.wagonDispatchPosition ?? (targetIndex >= 0 ? targetIndex + 1 : 0);

			await indexedDBService.atomicUpdate(['wagons', 'trainDispatches'], async (tx) => {
				const existingDispatch = await tx.objectStore('trainDispatches').get(trainDispatch!.id);
				if (!existingDispatch) throw new Error('Train dispatch not found in transaction');

				const oldWagon = await tx.objectStore('wagons').get(swapTargetWagon!.id);
				if (!oldWagon) throw new Error('Swap wagon not found in transaction');

				const replacementWagon = await tx.objectStore('wagons').get(newWagon.id);
				if (!replacementWagon) throw new Error('Replacement wagon not found in transaction');

				const updatedLinkedWagonIds = (existingDispatch.linkedWagonIds || []).map((id: string) =>
					id === targetLinkedId ? newWagonLinkedId : id
				);

				await tx.objectStore('wagons').put({
					...oldWagon,
					dispatchTimestamp: null,
					wagonDispatchPosition: 0,
					isWireSynced: false,
					syncStatus: 'pending'
				});

				await tx.objectStore('wagons').put({
					...replacementWagon,
					dispatchTimestamp: new Date(),
					wagonDispatchPosition: targetPosition,
					isWireSynced: false,
					syncStatus: 'pending'
				});

				await tx.objectStore('trainDispatches').put({
					...existingDispatch,
					linkedWagonIds: updatedLinkedWagonIds,
					isWireSynced: false,
					syncStatus: 'pending'
				});
			});

			trainDispatch = {
				...trainDispatch,
				linkedWagonIds: (trainDispatch.linkedWagonIds || []).map((id) =>
					id === targetLinkedId ? newWagonLinkedId : id
				)
			};
			success = 'Wagon swapped successfully';
			showSwapWagonInput = false;
			swapTargetWagon = null;
			await loadDispatch();
		} catch (e) {
			console.error('Error swapping wagon:', e);
			error = `Failed to swap wagon: ${e instanceof Error ? e.message : 'Unknown error'}`;
		}
	}
</script>

<ProcessLayout
	title="Wagon Linkage"
	{steps}
	{currentStep}
	bind:this={processLayout}
	isSubmitting={isLoading}
	cancelPath="/pmc/processes/magnetite-rail/marshaling-yard/marshaling-dispatch"
	on:cancel={() => goto('/pmc/processes/magnetite-rail/marshaling-yard/marshaling-dispatch')}
	on:submit={handleReview}
>
	{#if error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{error}
		</div>
	{/if}

	{#if isLoading}
		<div class="text-center">Loading...</div>
	{:else}
		<!-- Train Dispatch Info -->
		<div class="mb-6 rounded-lg border bg-gray-50 p-4">
			<h2 class="dark:text-gray mb-2 text-base font-semibold">Train Details</h2>
			<p class="dark:text-gray text-sm">
				Train Ref: <span class="font-bold">{train?.refNr || '-'}</span>
			</p>
			<p class="dark:text-gray text-sm">
				Consignment: <span class="font-bold">{consignment?.name || '-'}</span>
			</p>
		</div>

		<!-- Link Wagon -->
		{#if showWagonInput}
			<div
				class="bg-opacity-40 fixed inset-0 z-10 flex items-center justify-center backdrop-blur-sm"
				role="button"
				tabindex="0"
				on:click|self={() => showWagonInput = false}
				on:keydown={(e) => e.key === 'Escape' && (showWagonInput = false)}
			>
				<div class="m-6 w-full max-w-xs rounded-lg bg-white p-6 shadow-xl">
					<WagonInput
						siteLocation={'PMC'}
						on:submit={handleWagonSubmit} 
						on:cancel={handleWagonCancel} 
					/>
				</div>
			</div>
		<!-- Create Wagon -->
		{:else if  showCreateWagonInput}
			<div
				class="bg-opacity-40 fixed inset-0 z-10 flex items-center justify-center backdrop-blur-sm"
				role="button"
				tabindex="0"
				on:click|self={() => showCreateWagonInput = false}
				on:keydown={(e) => e.key === 'Escape' && (showCreateWagonInput = false)}
			>
				<div class="m-6 w-full max-w-xs rounded-lg bg-white p-6 shadow-xl">
					<WagonCreate
						wagonPosition={(trainDispatch?.linkedWagonIds?.length ?? 0) + 1}
						siteLocation={'PMC'}
						defaultLoadingLocation="West Load Out"
						on:submit={handleCreateSubmit}
						on:cancel={handleCreateCancel}
					/>
				</div>
			</div>
		{:else if showSwapWagonInput}
			<div
				class="bg-opacity-40 fixed inset-0 z-10 flex items-center justify-center backdrop-blur-sm"
				role="button"
				tabindex="0"
				on:click|self={handleSwapCancel}
				on:keydown={(e) => e.key === 'Escape' && handleSwapCancel()}
			>
				<div class="m-6 w-full max-w-xs rounded-lg bg-white p-6 shadow-xl">
					<div class="mb-4">
						<h5 class="text-xl font-bold text-gray">Swap Wagon</h5>
						<p class="text-gray-500">
							Replace {swapTargetWagon?.wagonIdSimple || 'the selected wagon'} with another wagon.
						</p>
					</div>
					<WagonInput
						swapping={true}
						siteLocation={'PMC'}
						on:submit={handleSwapSubmit}
						on:cancel={handleSwapCancel}
					/>
				</div>
			</div>
		{:else}
			<div class="flex items-center justify-between">
				<button
					class="bg-gray mb-1 mr-1 w-full rounded-md py-3 text-sm text-white hover:bg-blue-700"
					on:click={() => {
						currentStep = 2;
						showWagonInput = true;
					}}
					>Link Wagon
				</button>
				<button
					class="bg-gray mb-1 ml-1 w-full rounded-md py-3 text-sm text-white hover:bg-blue-700"
					on:click={() => {
						showCreateWagonInput = true;
					}}					
					>Create Wagon
				</button>
			</div>			
		{/if}
		
		<!-- Linked Wagons -->
		<div class="mb-6">			
			{#if linkedWagonIds.length > 0 && wagons}
				<div class="mb-3 rounded bg-gray-50 px-3 py-3 text-center text-xs text-gray-500">
					<div class="mb-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-lg text-gray">
						<span>Showing <span class="font-bold">{wagonPageStart}-{wagonPageEnd}</span> of <span class="font-bold">{linkedWagonIds.length}</span> linked wagons</span>
					</div>
					<div class="flex items-center justify-center gap-2">
						<button
							type="button"
							class="rounded border border-gray-300 bg-white px-3 py-1 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={safeWagonPage <= 1}
							on:click={() => setWagonPage(safeWagonPage - 1)}
						>
							{'<'}
						</button>
						<input 
							type="number" 
							class="rounded border border-gray-300 bg-white px-3 py-1 text-center text-sm text-gray-700" 
							min="1" 
							max={wagonPageCount} 
							value={safeWagonPage} 
							on:change={(e) => {
								const input = e.target as HTMLInputElement;
								let page = parseInt(input.value);
								if (isNaN(page)) page = 1;
								setWagonPage(page);
							}}
						/>
						<button
							type="button"
							class="rounded border border-gray-300 bg-white px-3 py-1 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={safeWagonPage >= wagonPageCount}
							on:click={() => setWagonPage(safeWagonPage + 1)}
						>
							{'>'}
						</button>
					</div>
				</div>
				<ul class="space-y-1">
					{#each paginatedLinkedWagonIds as id, i}
						{@const wagon = wagons?.find((w) => w.id === id || w.serverId === id)}
						<li class="flex items-center gap-3 rounded bg-white px-3 py-2 align-middle shadow-sm">
							<span class="flex h-18 w-10 shrink-0 items-center justify-center rounded bg-gray text-sm font-bold text-white tabular-nums">
								{wagon?.wagonDispatchPosition}
							</span>
							<div class="flex-1">
								<div class="text-gray font-medium">
									<span class="text-sm font-light">Wagon ID</span>: {wagon?.wagonIdSimple || 'Unknown'}
								</div>
								<div class="text-left text-xs text-gray-400">
									Date linked: {wagon?.updated
										? new Date(wagon.updated).toLocaleString('en-GB', {
												day: '2-digit',
												month: '2-digit',
												year: 'numeric',
												hour: '2-digit',
												minute: '2-digit',
												hour12: false
											})
										: '–'}
								</div>
								<!-- Label and checkbox inline -->
								{#if wagon}
									<div class="mt-1 flex items-center gap-2">
										<label
											for={'tarped-' + id}
											class="mt-2 text-xs text-gray-400"
											style="font-weight: semi-bold;"
										>
											Check box if wagon is tarped:
										</label>
										<input
											id={'tarped-' + id}
											type="checkbox"
											class="mt-2 ml-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
											checked={wagon.tarpedStatus === true}
											on:change={async (e) => {
												const target = e.target as HTMLInputElement | null;
												if (target && wagon) {
													const isChecked = target.checked;
													try {
														await indexedDBService.updateRecord('wagons', wagon.id, {
															...wagon,
															tarpedStatus: isChecked,
															updated: new Date().toISOString(),
															syncStatus: 'pending'
														});
														await loadDispatch();
													} catch (err) {
														console.error('Failed to update tarped status:', err);
														error = 'Failed to update tarped status';
													}
												}
											}}
										/>
									</div>
								{/if}
							</div>
							<div class="self-start pt-1">
								<Button
									aria-label="Wagon actions"
									on:click={() => handleWagonSwap(wagon)}
									class="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-white p-0 text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
								>
									<Repeat size={14} strokeWidth={2} />
								</Button>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-gray-400 italic">No wagons linked yet.</p>
			{/if}
		</div>		
	{/if}
</ProcessLayout>
<div class="button-group flex space-x-4">
	<button
		type="button"
		class="submit-button flex-1 items-center justify-center rounded-lg py-3 text-white transition hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
		on:click={() => (showPopup = true)}
	>
		Finalize Consignment
	</button>
</div>
<!-- Custom Popup -->
{#if showPopup}
	<div class="popup-overlay">
		<div class="popup-content">
			<p class="popup-message">Are you sure you are done with consignment {consignment?.name}?</p>
			<div class="popup-buttons">
				<button
					type="button"
					class="popup-button confirm-button"
					on:click={() => confirmFinishDispatch(true)}
				>
					Yes
				</button>
				<button
					type="button"
					class="popup-button cancel-button"
					on:click={() => confirmFinishDispatch(false)}
				>
					No
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.flex.space-x-4.button-group {
		margin-left: 1rem;
		margin-right: 1rem;
	}

	.popup-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.popup-content {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		text-align: center;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.popup-message {
		font-size: 1.2rem;
		margin-bottom: 1rem;
	}

	.popup-buttons {
		display: flex;
		justify-content: center;
		gap: 1rem;
	}

	.popup-button {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
	}

	.confirm-button {
		background: #4caf50;
		color: white;
	}

	.cancel-button {
		background: #f44336;
		color: white;
	}
</style>
