<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { pocketbaseService } from '$lib/services/pocketbaseService';
	import LoginForm from '$lib/components/LoginForm.svelte';

	let pageLoading = true;

	onMount(() => {
		if (pocketbaseService.isAuthenticated) {
			goto('/locations');
		}
		pageLoading = false;
	});
</script>
<section class="p-6">

{#if pageLoading}
	<div class="flex items-center justify-center">
		<div class="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
	</div>
{:else}
	<LoginForm on:success={(user) => goto('/locations')} />
{/if}
</section>
