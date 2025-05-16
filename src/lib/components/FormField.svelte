<script lang="ts">
	export let label: string;
	export let id: string;
	export let value: string = '';
	export let placeholder: string = '';
	export let type: string = 'text';
	export let required: boolean = false;
	export let error: string = '';
	export let disabled: boolean = false;

	// For select inputs
	export let options: { value: string; label: string }[] = [];
	export let isSelect: boolean = false;
</script>

<div class="space-y-1">
	<label for={id} class="block font-medium text-gray text-sm">{label}{required ? ' *' : ''}</label>

	{#if isSelect}
		<select
			{id}
			bind:value
			class="w-full rounded-lg border border-gray-300 px-2 py-2 focus:ring-2 focus:ring-gray-400 focus:outline-none {error
				? 'border-red-500'
				: ''}"
			{disabled}
			{required}
		>
			<option value="">{placeholder || 'Select an option'}</option>
			{#each options as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	{:else}
		<input
			{id}
			{type}
			bind:value
			{placeholder}
			class="w-full rounded-lg text-sm border text-gray border-gray-300 px-2 py-2 focus:ring-2 focus:ring-gray-400 focus:outline-none {error
				? 'border-red-500'
				: ''}"
			{disabled}
			{required}
		/>
	{/if}

	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}
</div>
