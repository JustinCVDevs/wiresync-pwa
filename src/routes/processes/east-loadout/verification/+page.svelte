<script lang="ts">
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { formPersistenceService } from '$lib/services/formPersistenceService';

	let sampleId = '';
	let productGrade = '';

	onMount(() => {
		const data = formPersistenceService.loadForm('east_loadout');
		sampleId = data?.sampleId || '';
		productGrade = data?.productGrade || '';
	});
</script>

<ProcessLayout title="East Loadout - Verification" processKey="east_loadout" showActions={false}>
	<div class="space-y-4">
		<FormField id="reviewSampleId" label="Sample ID" value={sampleId} disabled={true} />

		<FormField id="reviewProductGrade" label="Product Grade" value={productGrade} disabled={true} />
	</div>
</ProcessLayout>
