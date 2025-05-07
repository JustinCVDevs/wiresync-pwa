<!-- RFIDReader.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Scan, AlertTriangle } from 'lucide-svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { rfidService } from '$lib/services/rfid.service';
	import { Button } from '$lib/components/ui/button';

	export let onScan: (tagId: string, assetName?: string) => void;
	export let targetFieldId: string;
	export let label: string = 'Scan RFID Tag';

	let nfcAvailable = rfidService.isNFCAvailable();
	let nfcEnabled = rfidService.isNFCEnabled();
	let lastScanned: string | null = null;
	let assetName: string | null = null;
	let unregister: () => void;

	async function handleTagScanned(tagId: string) {
		lastScanned = tagId;
		try {
			const mapping = await indexedDBService.getTagById(tagId);
			if (mapping) {
				assetName = mapping.asset_name;
				onScan(tagId, mapping.asset_name);
			} else {
				assetName = null;
				onScan(tagId);
			}
		} catch {
			assetName = null;
			onScan(tagId);
		}
	}

	async function requestNFCPermission() {
		nfcEnabled = await rfidService.requestNFCPermission();
	}

	onMount(() => {
		unregister = rfidService.registerScanner(targetFieldId, handleTagScanned);
	});

	onDestroy(() => {
		unregister?.();
	});
</script>

<div class="bg-muted/30 mb-4 rounded-md border p-4">
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-sm font-medium">{label}</h3>

		{#if !nfcAvailable}
			<div class="text-alert-amber flex items-center text-xs">
				<AlertTriangle class="mr-1 h-3 w-3" />
				NFC not available
			</div>
		{:else if !nfcEnabled}
			<Button variant="outline" size="sm" class="text-xs" on:click={requestNFCPermission}>
				<Scan class="mr-1 h-3 w-3" />
				Enable NFC
			</Button>
		{/if}
	</div>

	<div
		class="bg-background flex h-20 items-center justify-center rounded-md border-2 border-dashed"
	>
		{#if lastScanned}
			<div class="text-center">
				<div class="font-mono text-sm">{lastScanned}</div>
				{#if assetName}
					<div class="text-muted-foreground mt-1 text-xs">{assetName}</div>
				{/if}
			</div>
		{:else}
			<div class="text-muted-foreground text-center">
				<Scan class="mx-auto mb-1 h-6 w-6" />
				<span class="text-sm">Ready to scan</span>
			</div>
		{/if}
	</div>

	<p class="text-muted-foreground mt-2 text-xs">
		Keyboard wedge scanner support is always active. Connect your RFID scanner and scan a tag.
	</p>
</div>
