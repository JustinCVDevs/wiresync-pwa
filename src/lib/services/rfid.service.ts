// src/services/rfid.service.ts
type TagCallback = (tagId: string) => void;

class RFIDService {
	private nfcReader?: NDEFReader;
	private nfcActive = false;

	isNFCAvailable(): boolean {
		return typeof window !== 'undefined' && 'NDEFReader' in window;
	}

	isNFCEnabled(): boolean {
		return this.nfcActive;
	}

	async requestNFCPermission(): Promise<boolean> {
		if (!this.isNFCAvailable()) return false;
		try {
			this.nfcReader = new NDEFReader();
			await this.nfcReader.scan();
			this.nfcActive = true;
			return true;
		} catch {
			this.nfcActive = false;
			return false;
		}
	}

	registerScanner(targetFieldId: string, onTagScanned: TagCallback): () => void {
		const listeners: Array<() => void> = [];

		// -- NFC listener --
		if (this.nfcReader && this.nfcActive) {
			const onReading = (ev: NDEFReadingEvent) => {
				const tagId = ev.serialNumber ?? '';
				onTagScanned(tagId);
			};
			this.nfcReader.addEventListener('reading', onReading as EventListener);
			listeners.push(() =>
				this.nfcReader!.removeEventListener('reading', onReading as EventListener)
			);
		}

		// -- Keyboard‐wedge listener --
		let buffer = '';
		let clearTimer: number;
		const resetBuffer = () => {
			buffer = '';
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Enter') {
				if (buffer) onTagScanned(buffer);
				resetBuffer();
			} else if (e.key.length === 1) {
				buffer += e.key;
				window.clearTimeout(clearTimer);
				clearTimer = window.setTimeout(resetBuffer, 200);
			}
		};
		window.addEventListener('keydown', onKey);
		listeners.push(() => window.removeEventListener('keydown', onKey));

		return () => {
			listeners.forEach((off) => off());
		};
	}
}

export const rfidService = new RFIDService();
