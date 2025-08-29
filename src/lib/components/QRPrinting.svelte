<script lang="ts">
    export let sampleId: string = '';
    import QRCode from 'qrcode';

    let qrImageUrl: string = '';
    let loading = false;

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
                // Create a hidden iframe for printing
                const iframe = document.createElement('iframe');
                iframe.style.position = 'fixed';
                iframe.style.right = '0';
                iframe.style.bottom = '0';
                iframe.style.width = '0';
                iframe.style.height = '0';
                iframe.style.border = '0';
                document.body.appendChild(iframe);

                iframe.onload = function () {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                    setTimeout(() => document.body.removeChild(iframe), 1000);
                };

                iframe.srcdoc = `
                    <html>
                        <head>
                            <title>Print QR Code</title>
                            <style>
                                body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #fff; }
                                img { max-width: 100%; }
                            </style>
                        </head>
                        <body>
                            <img src="${qrCode}" alt="QR Code" />
                        </body>
                    </html>
                `;
            }
            // Force loading for at least 3 seconds
            await new Promise(res => setTimeout(res, 3000));
        } finally {
            loading = false;
        }
    }
</script>

{#if loading}
    <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div class="bg-white p-6 rounded shadow text-center">
            <div class="mb-2 font-bold text-lg">Printing QR Code...</div>
            <div class="loader mx-auto my-2"></div>
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
</style>