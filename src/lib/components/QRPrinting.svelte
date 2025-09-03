<script lang="ts">
    export let sampleId: string = '';
    import QRCode from 'qrcode';
    import { tick } from 'svelte';

    let qrImageUrl: string = '';
    let loading = false;
    let printPending = false;

    function isMobile() {
        return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);
    }

    // Generate a combined image with Sample ID above QR code
    async function generateQRCode() {
        const qrCanvas = document.createElement('canvas');
        await QRCode.toCanvas(qrCanvas, sampleId, { errorCorrectionLevel: 'H', width: 384 });

        // Set up combined canvas
        const width = qrCanvas.width;
        const textHeight = 36;
        const height = qrCanvas.height + textHeight + 10; 

        const combinedCanvas = document.createElement('canvas');
        combinedCanvas.width = width;
        combinedCanvas.height = height;
        const ctx = combinedCanvas.getContext('2d');

        if (ctx) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, width, height);

            // Draw Sample ID text
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#000';
            ctx.fillText(sampleId, width / 2, textHeight);

            // Draw QR code below the text
            ctx.drawImage(qrCanvas, 0, textHeight + 5);
            qrImageUrl = combinedCanvas.toDataURL();
            return qrImageUrl;
        }
    }

    async function printQRCodes() {
        loading = true;
        try {
            const qrCode = await generateQRCode();
            if (qrCode) {
                if (isMobile()) {
                    // Open QR code in a new tab with print and close options
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                        printWindow.document.write(`
                            <html>
                                <head><title>QR Code</title></head>
                                <body style="text-align: center; margin: 20px;">
                                    <img src="${qrCode}" style="max-width: 100%;">
                                </body>
                            </html>
                        `);
                        printWindow.document.close();
                        printWindow.print();
                        setTimeout(() => {
                            printWindow.close();
                        }, 4000);
                    } else {
                        alert('Unable to open print window. Please allow pop-ups for this site.');
                    }
                } else {
                    // Desktop: open new window and print immediately
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                        printWindow.document.write(`
                            <html>
                                <head>
                                    <style>
                                        body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #fff; }
                                        img { max-width: 100%; width: 384px; }
                                    </style>
                                </head>
                                <body>
                                    <img src="${qrCode}" alt="QR Code" onload="window.print(); window.close();" />
                                </body>
                            </html>
                        `);
                        printWindow.document.close();
                    } else {
                        alert('Unable to open print window. Please allow pop-ups for this site.');
                    }
                }
            }
        } finally {
            loading = false;
        }
    }
</script>

<!-- Print-only area for mobile -->
<div id="print-area" style="display: none;">
    {#if qrImageUrl}
        <img
            src={qrImageUrl}
            alt="QR Code"
            style="max-width: 100%; width: 384px;"
            on:load={() => {
                if (printPending) {
                    window.print();
                    printPending = false;
                }
            }}
        />
    {/if}
</div>

{#if loading}
    <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div class="bg-white p-6 rounded shadow text-center">
            <div class="mb-2 font-bold text-lg">Printing QR Code...</div>
            <div class="loader mx-auto my-2"></div>
        </div>
    </div>
{/if}

{#if printPending && isMobile()}
    <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div class="bg-white p-6 rounded shadow text-center">
            <img
                src={qrImageUrl}
                alt="QR Code"
                style="max-width: 100%; width: 384px;"
                on:load={() => {
                    window.print();
                    printPending = false;
                }}
            />
        </div>
    </div>
{/if}

<div class="flex space-x-4 button-group">
    <button class="submit-button flex-1 items-center justify-center rounded-lg py-3 text-white transition hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
        on:click={printQRCodes}
        type="button"
        disabled={loading}>
        Print QR Codes
    </button>
</div>

<style>
.loader {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    animation: spin 1s linear infinite;
}
@keyframes spin {
    0% { transform: rotate(0deg);}
    100% { transform: rotate(360deg);}
}

/* Hide print area on screen, show only when printing */
#print-area {
    opacity: 0;
    pointer-events: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    text-align: center;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
}
@media print {
    :global(body > *:not(#print-area)) {
        display: none !important;
    }
    :global(#print-area) {
        opacity: 1 !important;
        pointer-events: auto !important;
        position: static !important;
        width: 100% !important;
        height: auto !important;
        z-index: 9999 !important;
        display: block !important;
        background: white !important;
    }
}
</style>