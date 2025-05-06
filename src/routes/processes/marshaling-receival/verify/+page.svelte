<script lang="ts">
    import { onMount } from 'svelte';
    import type { PageData } from './$types';
	import { goto } from '$app/navigation';
    
    export let data: PageData;
    let isOnline = navigator.onLine;
    let receivalData: any = null;
    let error = '';

    onMount(() => {
        const savedData = localStorage.getItem('currentMarshalingReceival');
        if (savedData) {
            receivalData = JSON.parse(savedData);
        } else {
            goto('/processes/marshaling-receival');
        }

        window.addEventListener('online', () => isOnline = true);
        window.addEventListener('offline', () => {
            isOnline = false;
            error = 'Offline - changes will be saved locally';
        });

        return () => {
            window.removeEventListener('online', () => isOnline = true);
            window.removeEventListener('offline', () => isOnline = false);
        };
    });

    async function handleConfirm() {
        try {
            // TODO: Implement API submission
            localStorage.removeItem('currentMarshalingReceival');
            goto('/processes');
        } catch (err) {
            error = 'Failed to submit receival data';
        }
    }

    function handleVerify() {
        const date = new Date();
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getFullYear().toString().slice(-2)}`;
        const transactionName = `${formattedDate}_${data.wagonId}_SIMPLE`;

        // Create WIRE transaction for WAGON component type
        createWireTransaction({
            name: transactionName,
            componentType: 'WAGON'
        });
    }

    async function createWireTransaction(transaction: { name: string; componentType: string }) {
        try {
            const response = await fetch('/api/wire/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transaction)
            });

            if (!response.ok) {
                throw new Error('Failed to create WIRE transaction');
            }

            // Handle successful transaction creation
            // You might want to redirect or show a success message
        } catch (error) {
            console.error('Error creating WIRE transaction:', error);
            // Handle error appropriately
        }
    }
</script>

<div class="app-container" class:online={isOnline} class:offline={!isOnline}>
    <div class="verification-container">
        <h1>Verify Information</h1>
        <!-- Add verification details here -->
        <button class="verify-button" on:click={handleVerify}>
            Verify
        </button>
    </div>
</div>

<style>
    .app-container {
        min-height: 100vh;
        border: 8px solid;
        margin: 0;
        padding: 1rem;
        box-sizing: border-box;
    }

    .online {
        border-color: #4CAF50;
    }

    .offline {
        border-color: #FF9800;
    }

    .verification-container {
        max-width: 600px;
        margin: 0 auto;
        padding: 2rem;
    }

    .verify-button {
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
</style>