<script lang="ts">
	import type { Assay } from '$lib/types/assay';
	import type { Wagon } from '$lib/types/wagon';

	export let assay: Assay;
	export let wagons: Wagon[] = [];
</script>

<div class="transaction-details">
	<div class="details-card">
		<h2>Transaction Details</h2>
		<div class="detail-row">
			<span>Sample ID:</span>
			<span>{assay.name}</span>
		</div>
		<div class="detail-row">
			<span>Product Grade:</span>
			<span>{assay.productGrade}</span>
		</div>
		<div class="detail-row">
			<span>Loading Location:</span>
			<span>{assay.location}</span>
		</div>
	</div>

	<div class="wagons-section">
		<h2>Loaded Wagons For This Sample: {wagons.length}</h2>
		{#each wagons as wagon}
			<div class="wagon-card">
				<div class="detail-row">
					<span>Wagon ID:</span>
					<span>{wagon.wagonIdSimple}</span>
				</div>
				<div class="detail-row">
					<span>Wagon Weight:</span>
					<span>{wagon.weight} kg</span>
				</div>
				<div class="detail-row">
					<span>Sample ID:</span>
					<span>{assay.name}</span>
				</div>
				<div class="detail-row">
					<span>Sampled:</span>
					<span>{wagon.samplingStatus}</span>
				</div>
			</div>
		{/each}
	</div>

	<slot />
</div>

<style>
	.transaction-details {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.details-card,
	.wagon-card {
		background: white;
		padding: 1.5rem;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 0;
		border-bottom: 1px solid #eee;
	}

	.detail-row:last-child {
		border-bottom: none;
	}

	h2 {
		margin: 0 0 1rem 0;
		color: #333;
	}

	.wagons-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
