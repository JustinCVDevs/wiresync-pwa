<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { rfidService } from '$lib/services/rfid.service';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { Button } from '$lib/components/ui/button';
	import { Scan, AlertTriangle } from 'lucide-svelte';

	export let availableTrucks: { registration: string; serverId: string }[] = [];
	export let selectedValue: string;

	let scanStatus: 'idle' | 'scanning' | 'matched' | 'unmatched' = 'idle';
	let lastScannedId: string | null = null;
	let unregisterScanner: () => void;

	const dispatch = createEventDispatcher<{
		select: string;
		'pairing-required': { truckId: string; tagId: string };
	}>();

	async function handleTagScanned(tagId: string) {
		lastScannedId = tagId;
		scanStatus = 'scanning';

		try {
			const existingTruck = availableTrucks.find((t) => t.registration === tagId);
			if (existingTruck) {
				selectedValue = existingTruck.registration;
				scanStatus = 'matched';
				dispatch('select', existingTruck.registration);
			} else {
				const existingMapping = await indexedDBService.getTagById(tagId);
				if (!existingMapping) {
					scanStatus = 'unmatched';
					dispatch('pairing-required', { truckId: '', tagId });
				}
			}
		} catch {
			scanStatus = 'idle';
		}
	}

	onMount(() => {
		unregisterScanner = rfidService.registerScanner('truck-registration', handleTagScanned);
	});

	onDestroy(() => {
		unregisterScanner?.();
	});
</script>

<div class="form-field">
	<label for="truckRegistration" class="form-label"
		>Scan Truck Registration QR Code or enter manually</label
	>
	<select
		id="truckRegistration"
		class="flex w-full items-center rounded border border-1 p-4 px-5"
		bind:value={selectedValue}
		required
	>
		{#each availableTrucks as truck}
			<option value={truck.serverId}>{truck.registration}</option>
		{/each}
	</select>
</div>
