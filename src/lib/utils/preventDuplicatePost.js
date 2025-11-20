// Prevents duplicate POST requests by tracking in-flight requests by a unique key (e.g., sampleId)
const inFlightRequests = new Set();

/**
 * Prevents duplicate POST requests for the same key while a request is in progress.
 * @param {string} key - Unique identifier for the request (e.g., sampleId or endpoint+payload hash)
 * @param {() => Promise<any>} postFn - Async function that performs the POST request
 * @returns {Promise<any>} - The result of the POST request, or an error if duplicate
 */
export async function preventDuplicatePost(key, postFn) {
	if (inFlightRequests.has(key)) {
		return { error: 'Duplicate request blocked' };
	}
	inFlightRequests.add(key);
	try {
		const result = await postFn();
		return result;
	} finally {
		inFlightRequests.delete(key);
	}
}
