<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Wagon } from '$lib/types';
	import type { ShuntingTrain } from '$lib/types/shuntingTrain';
	import FormField from '$lib/components/FormField.svelte';
	import DoubleConfirmField from '$lib/components/DoubleConfirmField.svelte';
	import { BrowserQRCodeReader } from '@zxing/browser';

	let wagon: Wagon | null = null;
	let shuntingTrain: ShuntingTrain | null = null;
	let error = '';
	let success = '';
	let isLoading = true;
	let isSubmitting = false;
	let trainId: string;
	let wagonId: string;
	let wagonPosition: number = 0;

	// Editable fields
	let editableWagonId = '';
	let editableWagonIdConfirm = '';
	let editableTemporaryRfid = '';
	let editableTemporaryRfidConfirm = '';
	let rfidFocused = false;
	let rfidScannedDirectly = false;

	// QR scanner state
	let showScanner = false;
	let scannerVideoEl: HTMLVideoElement | null = null;
	let scannerControls: { stop: () => void } | null = null;
	let scanError = '';

	const steps = ['Select Shunting Train', 'Wagon ID/RFID Editing'];
	let currentStep = 2;

	$: {
		try {
			trainId = $page.params.trainId;
		} catch (e) {
			console.error('Error getting trainId:', e);
			trainId = '';
		}
	}

	$: {
		try {
			wagonId = $page.params.wagonId;
		} catch (e) {
			console.error('Error getting wagonId:', e);
			wagonId = '';
		}
	}

	let showWagonIdError = false;
	let showRfidError = false;
	let wagonIdErrorMsg = '';
	let rfidErrorMsg = '';

	$: wagonIdValid = !!editableWagonId && editableWagonId === editableWagonIdConfirm;
	$: rfidValid = rfidScannedDirectly
		? !!editableTemporaryRfid
		: !rfidFocused || (!!editableTemporaryRfid && editableTemporaryRfid === editableTemporaryRfidConfirm);

	async function openScanner() {
		scanError = '';
		showScanner = true;
		await tick();

		if (!scannerVideoEl) return;

		try {
			const codeReader = new BrowserQRCodeReader();
			scannerControls = await codeReader.decodeFromConstraints(
				{ video: { facingMode: 'environment' } },
				scannerVideoEl,
				(result, err) => {
					if (result) {
						editableTemporaryRfid = result.getText();
						rfidScannedDirectly = true;
						rfidFocused = false;
						editableTemporaryRfidConfirm = '';
						closeScanner();
					}
				}
			);
		} catch (e) {
			scanError = e instanceof Error ? e.message : 'Camera access denied or unavailable';
		}
	}

	function closeScanner() {
		if (scannerControls) {
			scannerControls.stop();
			scannerControls = null;
		}
		showScanner = false;
		scanError = '';
	}

	async function loadWagonAndTrain() {
		try {
			shuntingTrain = await indexedDBService.getRecord('shuntingTrains', trainId) ?? null;

			if (!shuntingTrain) {
				console.error('Shunting train not found');
				error = 'Shunting train not found';
				isLoading = false;
				return;
			}

			wagon = await indexedDBService.getRecord('wagons', wagonId) ?? null;
			wagonPosition = wagon?.wagonPosition || 0;

			if (!wagon) {
				console.error('Wagon not found with ID:', wagonId);
				if (shuntingTrain.linkedWagons && shuntingTrain.linkedWagons.length > 0) {
					const wagonIndex = wagonPosition - 1;
					if (wagonIndex >= 0 && wagonIndex < shuntingTrain.linkedWagons.length) {
						const linkedWagonId = shuntingTrain.linkedWagons[wagonIndex];
						wagon = await indexedDBService.getRecord('wagons', linkedWagonId) ?? null;
					}
				}

				if (!wagon) {
					error = `Wagon not found. Wagon ID: ${wagonId}, Position: ${wagonPosition}`;
					isLoading = false;
					return;
				}
			}

			// Initialize editable fields with current values
			editableWagonId = wagon.wagonIdSimple || '';
			editableWagonIdConfirm = wagon.wagonIdSimple || '';
			editableTemporaryRfid = wagon.transcoreTag || '';
		} catch (e) {
			console.error('Error loading wagon and train:', e);
			error = `Failed to load wagon and train data: ${(e as Error).message || String(e)}`;
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		try {
			loadWagonAndTrain();
		} catch (e) {
			console.error('Error in onMount:', e);
			error = 'Failed to initialize page';
			isLoading = false;
		}
	});

	onDestroy(() => {
		if (scannerControls) {
			scannerControls.stop();
			scannerControls = null;
		}
	});

	async function handleSubmit() {
		if (editableWagonId !== editableWagonIdConfirm) {
			wagonIdErrorMsg = 'Wagon IDs do not match';
			showWagonIdError = true;
			editableWagonId = '';
			editableWagonIdConfirm = '';
			return;
		}
		if (rfidFocused && !rfidScannedDirectly && editableTemporaryRfid !== editableTemporaryRfidConfirm) {
			rfidErrorMsg = 'RFID tags do not match';
			showRfidError = true;
			editableTemporaryRfid = '';
			editableTemporaryRfidConfirm = '';
			return;
		}

		try {
			isSubmitting = true;
			error = '';

			if (!wagon) {
				error = 'Wagon data not available';
				return;
			}

			try {
				await indexedDBService.updateRecord('wagons', wagon.id, {
					...wagon,
					wagonIdSimple: editableWagonId,
					transcoreTag: editableTemporaryRfid,
					syncStatus: 'pending',
					isWireSynced: false
				});
			} catch (dbError) {
				console.error('IndexedDB transaction failed:', dbError);
				throw new Error(`Database update failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
			}

			if (typeof window !== 'undefined') {
				const event = new CustomEvent('wagon-updated', {
					detail: { wagonId: wagon.id, trainId: trainId }
				});
				window.dispatchEvent(event);
			}

			try {
				const { syncService } = await import('$lib/services/syncService');
				const updatedWagon = await indexedDBService.getRecord('wagons', wagon.id);
				if (updatedWagon) {
					await syncService.syncWagon(updatedWagon);
					success = 'Wagon details updated and synced successfully';
				} else {
					success = 'Wagon details updated successfully (sync pending)';
				}
			} catch (syncError) {
				console.warn('Sync failed, will retry in background:', syncError);
				success = 'Wagon details updated successfully (sync will retry)';
			}

			await goto(`/bosveld/processes/marshaling-yard/wagon-id-linking/wagons/${trainId}`, {
				invalidateAll: true
			});
		} catch (e: any) {
			console.error('Error updating wagon:', e);
			error = `Failed to update wagon details: ${e.message || e}`;
		} finally {
			isSubmitting = false;
		}
	}

	function handleBackToWagonDetails() {
		try {
			goto(`/bosveld/processes/marshaling-yard/wagon-id-linking/wagons/${trainId}`);
		} catch (e) {
			console.error('Error navigating back:', e);
			error = 'Failed to navigate back';
		}
	}

	function formatDate(date: Date | undefined): string {
		try {
			if (!date) return 'No date';
			return new Date(date).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch (e) {
			console.error('Error formatting date:', e);
			return 'Invalid date';
		}
	}

	if (typeof window !== 'undefined') {
		window.addEventListener('error', (e) => {
			console.error('Unhandled error:', e);
			e.preventDefault();
		});

		window.addEventListener('unhandledrejection', (e) => {
			console.error('Unhandled promise rejection:', e);
			e.preventDefault();
		});
	}
</script>

<div class="space-y-4 px-4 mb-4">
	<h1 class="text-gray text-center text-2xl font-semibold">Updating Wagon Details</h1>

	<!-- Progress Steps -->
	<div class="grid auto-cols-fr grid-flow-col text-center text-[10px]">
		{#each steps as step, i}
			<div class="flex flex-col items-center">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-full {currentStep >= i + 1
						? 'bg-gray text-white'
						: 'bg-gray-300'}"
				>
					{i + 1}
				</div>
				<span class="dark:text-gray mt-1 font-light">{step}</span>
			</div>
			{#if i < steps.length - 1}
				<div
					class="h-1 flex-1 self-center {currentStep > i + 1 ? 'bg-gray' : 'bg-slate-200'}"
				></div>
			{/if}
		{/each}
	</div>

	<div class="mt-6">
		<div>
			<h5 class="text-xl font-bold text-gray">Updating Wagon Details</h5>
		</div>

		{#if error}
			<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
				{error}
				<div class="text-xs mt-2">
					Debug info: Train ID: {trainId}, Wagon ID: {wagonId}, Position: {wagonPosition}
				</div>
			</div>
		{/if}

		{#if success}
			<div class="mb-4 rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
				{success}
			</div>
		{/if}

		{#if isLoading}
			<div class="flex justify-center items-center py-8">
				<div>Loading wagon details...</div>
			</div>
		{:else if wagon && shuntingTrain}
			<!-- Train Selection Display -->
			<div class="mb-6 p-4 bg-gray-50 rounded-lg">
				<h6 class="font-semibold text-gray-700 mb-2">Train Selection</h6>
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						{formatDate(shuntingTrain.postDate).split(',')[0]}
					</div>
					<div>
						{formatDate(shuntingTrain.postDate).split(',')[1]?.trim() || ''}
					</div>
				</div>
				<p class="text-xs text-gray-500 mt-2">
					Manually type in the Wagon ID and scan the temporary RFID in using a reader.
				</p>
			</div>

			<!-- Wagon Details Form -->
			<div class="border border-gray-300 rounded-lg p-4 bg-white">
				<div class="mb-3">
					<h6 class="font-semibold text-center">Position {wagonPosition}</h6>
				</div>

				<div class="space-y-4">
					<!-- Wagon ID (Editable) -->
					<DoubleConfirmField
						label="Wagon ID:"
						bind:value1={editableWagonId}
						bind:value2={editableWagonIdConfirm}
						error={showWagonIdError ? wagonIdErrorMsg : ''}
						on:field2focus={() => { showWagonIdError = false; }}
					/>

					<!-- Temporary RFID (Editable) -->
					{#if rfidFocused}
						<!-- svelte-ignore a11y_consider_explicit_label -->
						<DoubleConfirmField
							label="Temporary RFID:"
							bind:value1={editableTemporaryRfid}
							bind:value2={editableTemporaryRfidConfirm}
							error={showRfidError ? rfidErrorMsg : ''}
							on:field2focus={() => { showRfidError = false; }}
						>
							<svelte:fragment slot="field1-icon">
								<button
									type="button"
									class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
									on:click={openScanner}
								>
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
										<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
										<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
									</svg>
								</button>
							</svelte:fragment>
						</DoubleConfirmField>
					{:else}
						<div class="space-y-1">
							<label for="temporaryRfid" class="block font-medium text-gray text-sm">Temporary RFID: *</label>
							<div class="relative">
								<input
									id="temporaryRfid"
									type="text"
									bind:value={editableTemporaryRfid}
									placeholder="Scan or enter Temporary RFID"
									class="w-full rounded-lg text-sm border px-3 py-2 pr-10 text-gray border-gray-300 focus:ring-2 focus:ring-gray-400 focus:outline-none"
									on:focus={() => { rfidFocused = true; }}
								/>
								<!-- svelte-ignore a11y_consider_explicit_label -->
								<button
									type="button"
									class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
									tabindex="-1"
									on:click={openScanner}
								>
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
										<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
										<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
									</svg>
								</button>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex gap-4 mt-6">
				<button
					type="button"
					class="cancel-button flex-1 border-2 rounded-lg py-3 border border-gray-800 text-sm text-white transition hover:bg-red-700 active:bg-red-800 disabled:opacity-50"
					on:click={handleBackToWagonDetails}
					disabled={isSubmitting}
				>
					Cancel
				</button>

				<button
					type="button"
					class="submit-button flex-1 items-center justify-center rounded-lg py-3 text-white transition hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
					on:click={handleSubmit}
					disabled={isSubmitting}
				>
					{isSubmitting ? 'Submitting...' : 'Submit'}
				</button>
			</div>
		{:else}
			<div class="text-center py-8 text-gray-500">
				<p>Wagon or train data not found.</p>
				<p class="text-sm mt-2">Wagon ID: {wagonId}</p>
				<p class="text-sm">Train ID: {trainId}</p>
				<p class="text-sm">Position: {wagonPosition}</p>
				<button
					type="button"
					class="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
					on:click={handleBackToWagonDetails}
				>
					Go Back
				</button>
			</div>
		{/if}
	</div>
</div>

<!-- QR Scanner Modal -->
{#if showScanner}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex flex-col bg-black"
		on:keydown={(e) => e.key === 'Escape' && closeScanner()}
	>
		<div class="flex items-center justify-between px-4 py-3 bg-black">
			<span class="text-white font-medium">Scan Transcore Tag</span>
			<button
				type="button"
				class="text-white text-2xl leading-none px-2"
				on:click={closeScanner}
			>✕</button>
		</div>

		<div class="flex-1 relative overflow-hidden">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				bind:this={scannerVideoEl}
				class="w-full h-full object-cover"
				playsinline
				autoplay
			></video>
			<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
				<div class="w-56 h-56 border-2 border-white rounded-lg opacity-70"></div>
			</div>
		</div>

		{#if scanError}
			<div class="px-4 py-3 bg-red-700 text-white text-sm text-center">{scanError}</div>
		{:else}
			<div class="px-4 py-3 bg-black text-gray-400 text-sm text-center">
				Point the camera at the QR code
			</div>
		{/if}
	</div>
{/if}
