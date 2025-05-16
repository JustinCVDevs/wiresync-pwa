<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Camera from './Camera.svelte';
	import RfidReader from './RFIDReader.svelte';

	export let wagonId = '';
	export let rfidTag = '';

	let showCamera = false;
	let capturedImage: File | null = null;

	const dispatch = createEventDispatcher<{
		submit: { wagonId: string; rfidTag: string; image: File | null };
		cancel: void;
	}>();

	function handleSubmit() {
		dispatch('submit', { wagonId, rfidTag, image: capturedImage });
	}

	function handleCancel() {
		dispatch('cancel');
	}

	function handleCapture(event: CustomEvent<File>) {
		capturedImage = event.detail;
	}
</script>

<div class="">

	<RfidReader label="Please Scan or Enter Wagon ID:" onScan={(tagId)=>{ rfidTag = tagId}} targetFieldId="rfidTag" defaultValue={rfidTag}/>
	

	{#if capturedImage}
		<div class="image-preview">
			<img src={capturedImage.arrayBuffer} alt="Captured wagon" />
			<button class="camera-button" on:click={() => (showCamera = true)}> Retake Photo </button>
		</div>

	{/if}

	<div class="flex justify-between items-center pt-8">
		<button class=" w-36 text-sm rounded-lg bg-red py-3 text-white transition hover:bg-red-700 active:bg-red-800 disabled:opacity-50 px-2" on:click={handleCancel}>Cancel</button>
		<button
		on:click={handleSubmit}
		class="w-36 text-sm items-center justify-center rounded-lg bg-gray py-3 px-2  text-white transition hover:bg-green-700 active:bg-black disabled:opacity-50"
		type="submit"
	>
			Submit Wagon</button>
	</div>
</div>

