/**
 * FormPersistenceService
 *
 * This service provides utilities for persisting form data in localStorage
 * to ensure data is not lost between sessions if a form is not successfully submitted.
 */

export const formPersistenceService = {
	/**
	 * Save form data to localStorage
	 * @param key The unique key for the form (usually process name)
	 * @param data The form data to save
	 */
	saveForm: (key: string, data: Record<string, any>) => {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(`form_${key}`, JSON.stringify(data));
		}
	},

	/**
	 * Load form data from localStorage
	 * @param key The unique key for the form
	 * @returns The saved form data or null if none exists
	 */
	loadForm: <T>(key: string): T | null => {
		if (typeof localStorage !== 'undefined') {
			const savedData = localStorage.getItem(`form_${key}`);
			if (savedData) {
				try {
					return JSON.parse(savedData) as T;
				} catch (e) {
					console.error('Error parsing saved form data:', e);
					return null;
				}
			}
		}
		return null;
	},

	/**
	 * Clear form data from localStorage
	 * @param key The unique key for the form
	 */
	clearForm: (key: string) => {
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem(`form_${key}`);
		}
	},

	/**
	 * Convert a data URL to a File object
	 * @param dataUrl The data URL string
	 * @param filename The filename to use
	 * @returns A File object
	 */
	dataURLtoFile: (dataUrl: string, filename: string): File | null => {
		if (!dataUrl) return null;

		try {
			const [header, b64] = dataUrl.split(',');
			const mime = header.match(/:(.*?);/)?.[1] ?? '';
			const binary = atob(b64);
			const u8 = new Uint8Array(binary.length);
			for (let i = 0; i < binary.length; i++) {
				u8[i] = binary.charCodeAt(i);
			}
			return new File([u8], filename, { type: mime });
		} catch (e) {
			console.error('Error converting data URL to file:', e);
			return null;
		}
	},

	/**
	 * Convert a File to a data URL
	 * @param file The File object
	 * @returns A Promise that resolves to a data URL string
	 */
	fileToDataURL: (file: Blob | File): Promise<string> => {
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.readAsDataURL(file);
		});
	}
};
