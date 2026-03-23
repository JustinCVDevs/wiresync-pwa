import { indexedDBService } from './indexedDBService';
import { pocketbaseService } from './pocketbaseService';
import type { PBCollection } from './pocketbaseService';
import type { Assay } from '$lib/types/assay';
import type { Wagon } from '$lib/types/wagon';
import type { TruckLoad } from '$lib/types/truckLoad';
import type { TrainDispatch } from '$lib/types/trainDispatch';
import type { ShuntingTrain } from '$lib/types/shuntingTrain';
import type { TruckArrival } from '$lib/types/truckArrival';
import type { Fleet, Truck } from '$lib/types';
import type { TrainArrival } from '$lib/types/trainArrival';
import type { DedicatedFleetTruck } from '$lib/types/dedicatedFleetTruck';
import type { Consignment } from '$lib/types/consignment';

function base64ToBlob(base64: string, mime: string) {
	// Always use a supported image format (default to image/jpeg)
	let format = mime;
	if (!format || !format.startsWith('image/')) {
		format = 'image/jpeg';
	}
	// If the base64 string includes a mime type, extract it
	const matches = base64.match(
		/^data:(image\/(jpeg|png|webp|gif|bmp|jpg|svg\+xml|tiff|x-icon|heic|heif));base64,/
	);
	if (matches && matches[1]) {
		// If HEIC/HEIF, fallback to jpeg (PocketBase doesn't support HEIC/HEIF)
		if (matches[2] === 'heic' || matches[2] === 'heif') {
			format = 'image/jpeg';
		} else {
			format = matches[1];
		}
	}
	const byteString = atob(base64.split(',')[1]);
	const ab = new ArrayBuffer(byteString.length);
	const ia = new Uint8Array(ab);
	for (let i = 0; i < byteString.length; i++) {
		ia[i] = byteString.charCodeAt(i);
	}
	return new Blob([ab], { type: format });
}

let runningList = false;
let runningDeletedRecordsSync = new Set<string>();
let lastSyncCompletedTime = 0;

async function fetchAllFromPocketBase(
	collection: PBCollection,
	perPage = 1000,
	filterString?: string
) {
	let page = 1;
	let items: any[] = [];
	let allItems: any[] = [];
	let response;
	do {
		response = await pocketbaseService.list(collection, { page, perPage, filterString });
		items = response.items;
		allItems = allItems.concat(items);
		page++;

		// Add small delay between pages to avoid overwhelming the server
		if (items.length === perPage) {
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
	} while (items.length === perPage);
	return allItems;
}

async function syncDeletedRecords(collectionName: string) {
	if (runningDeletedRecordsSync.has(collectionName)) {
		return true;
	}

	runningDeletedRecordsSync.add(collectionName);

	try {
		// Fetch ALL server records (no date filter)
		let page = 1;
		const perPage = 1000;
		let allServerRecords: any[] = [];
		let totalPages = 0;
		do {
			const res = await pocketbaseService.list(collectionName as PBCollection, {
				page,
				perPage
			});
			if (page === 1) {
				totalPages = res.totalPages || 0;
			}
			allServerRecords = allServerRecords.concat(res.items);
			page++;
			if (res.items.length > 0 && page <= 10) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		} while (page <= totalPages && page < 1000);

		const serverIds = new Set<string>(allServerRecords.map((item) => item.id));

		// Fetch ALL local records (no date filter)
		const allLocalRecords = await indexedDBService.getRecords(
			collectionName as any,
			(rec: { serverId?: string }) => !!rec.serverId
		);

		// 1. Remove all local records that don't exist on the server (unless syncStatus = 'pending')
		const recordsToDelete = allLocalRecords.filter(
			(rec: any) => rec.syncStatus !== 'pending' && !serverIds.has(rec.serverId!)
		);
		for (const rec of recordsToDelete) {
			try {
				await indexedDBService.deleteRecord(collectionName as any, rec.id);
			} catch (err) {
				console.warn(`⚠️ Failed to delete record ${rec.id} from ${collectionName}:`, err);
			}
		}

		// 2. Apply 2-week filter to server records
		const twoWeeksAgo = new Date();
		twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
		const filteredServerIds = new Set(
			allServerRecords
				.filter((item) => {
					if (!item.created) return false;
					const createdDate = new Date(item.created);
					return createdDate >= twoWeeksAgo;
				})
				.map((item) => item.id)
		);

		// 3. Remove local records that match the filtered (recent) server records
		const neverDeleteOld = ['dedicatedFleetTrucks'];
		if (!neverDeleteOld.includes(collectionName)) {
			const localRecordsToDelete = allLocalRecords.filter((rec: any) => {
				if (rec.syncStatus === 'pending') return false;
				// If the local record's serverId is in the filtered (recent) server records, delete it
				return filteredServerIds.has(rec.serverId!);
			});
			for (const rec of localRecordsToDelete) {
				try {
					await indexedDBService.deleteRecord(collectionName as any, rec.id);
				} catch (err) {
					console.warn(`⚠️ Failed to delete old record ${rec.id} from ${collectionName}:`, err);
				}
			}
		}
		return true;
	} catch (err) {
		console.warn(`❌ Failed to reconcile deletions for ${collectionName}:`, err);
		return false;
	} finally {
		runningDeletedRecordsSync.delete(collectionName);
	}
}

export const syncService = {
	// ════════════════════════════════════════════════════════════════════════
	// ASSAY SYNC METHODS
	// ════════════════════════════════════════════════════════════════════════
	async syncAssayList() {
		try {
			// Calculate date threshold for old records (2 weeks ago)
			const twoWeeksAgo = new Date();
			twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
			const twoWeeksAgoFormatted = twoWeeksAgo.toISOString().split('T')[0]; // yyyy-mm-dd

			// Fetch only records from the last 2 weeks - server-side filtering
			const allAssays = await fetchAllFromPocketBase(
				'assays',
				1000,
				`created >= "${twoWeeksAgoFormatted}"`
			);
			const allIndexedAssays = await indexedDBService.getRecords('assays');

			for (const assay of allAssays) {
				const existingAssay = allIndexedAssays.find(
					(a) => a.serverId === assay.id || a.id === assay.id
				);

				if (existingAssay) {
					// Only update if not pending
					if (existingAssay.syncStatus !== 'pending') {
						await indexedDBService.updateRecord('assays', existingAssay.id, {
							...existingAssay,
							process: assay.process,
							name: assay.name,
							materialType: assay.materialType,
							location: assay.location,
							linkedWagonIds: assay.linkedWagonIds,
							linkedTruckIds: assay.linkedTruckIds,
							linkedTruckLoadIds: assay.linkedTruckLoadIds,
							linkedFleetIds: assay.linkedFleetIds,
							linkedDedicatedFleetTruckIds: assay.linkedDedicatedFleetTruckIds,
							sampleSize: assay.sampleSize,
							commodity: assay.commodity,
							productType: assay.productType,
							dedicatedFleet: assay.dedicatedFleet,
							sampleId: assay.sampleId,
							siteLocation: assay.siteLocation,
							syncStatus: 'synced',
							serverId: assay.id,
							isWireSynced: assay.isWireSynced,
							created: assay.created,
							updated: assay.updated
						});
					} else {
						console.log(`⏸️ Skipping update for pending assay record: ${existingAssay.id}`);
					}
				} else {
					// Create new record (already filtered by date on server)
					await indexedDBService.saveRecord('assays', {
						id: assay.id,
						process: assay.process,
						name: assay.name,
						materialType: assay.materialType,
						location: assay.location,
						linkedWagonIds: assay.linkedWagonIds,
						linkedTruckIds: assay.linkedTruckIds,
						linkedTruckLoadIds: assay.linkedTruckLoadIds,
						linkedFleetIds: assay.linkedFleetIds,
						linkedDedicatedFleetTruckIds: assay.linkedDedicatedFleetTruckIds,
						sampleSize: assay.sampleSize,
						commodity: assay.commodity,
						productType: assay.productType,
						dedicatedFleet: assay.dedicatedFleet,
						sampleId: assay.sampleId,
						siteLocation: assay.siteLocation,
						syncStatus: 'synced',
						serverId: assay.id,
						user: pocketbaseService.currentUser?.id || '',
						created: assay.created,
						updated: assay.updated,
						isWireSynced: assay.isWireSynced
					});
				}
			}
			return true;
		} catch (err: any) {
			if (!err?.message?.includes('autocancelled')) {
				console.error('❌ Failed to sync assay list:', err);
			}
			return false;
		}
	},

	async syncAssay(assay: Assay) {
		try {
			const { id, syncStatus, ...payload } = assay;

			// Ensure all linked items are synced before syncing the assay
			if (assay.linkedWagonIds?.length) {
				const ids = assay.linkedWagonIds.filter((v): v is string => !!v);
				let wagons = await Promise.all(ids.map((wid) => indexedDBService.getRecord('wagons', wid)));
				for (const wagon of wagons) {
					if (wagon && wagon.syncStatus !== 'synced') {
						await syncService.syncWagon(wagon);
					}
				}
				wagons = await Promise.all(ids.map((wid) => indexedDBService.getRecord('wagons', wid)));
				const serverIds = wagons.map((w) => w?.serverId).filter((sid): sid is string => !!sid);
				if (serverIds.length !== wagons.length) {
					console.warn('Waiting for all wagons to sync before updating assay');
					return false;
				}
				payload.linkedWagonIds = serverIds;
			}

			if (assay.linkedTruckLoadIds?.length) {
				const ids = assay.linkedTruckLoadIds.filter((v): v is string => !!v);
				let loads = await Promise.all(ids.map((tid) => indexedDBService.getRecord('truckLoads', tid)));
				for (const load of loads) {
					if (load && load.syncStatus !== 'synced') {
						await syncService.syncTruckLoad(load);
					}
				}
				loads = await Promise.all(ids.map((tid) => indexedDBService.getRecord('truckLoads', tid)));
				const serverIds = loads.map((l) => l?.serverId).filter((sid): sid is string => !!sid);
				if (serverIds.length !== loads.length) {
					console.warn('Waiting for all truck loads to sync before updating assay');
					return false;
				}
				payload.linkedTruckLoadIds = serverIds;
			}

			if (assay.linkedTruckIds?.length) {
				const ids = assay.linkedTruckIds.filter((v): v is string => !!v);
				let trucks = await Promise.all(ids.map((tid) => indexedDBService.getRecord('trucks', tid)));
				for (const truck of trucks) {
					if (truck && truck.syncStatus !== 'synced') {
						await syncService.syncTruck(truck);
					}
				}
				trucks = await Promise.all(ids.map((tid) => indexedDBService.getRecord('trucks', tid)));
				const serverIds = trucks.map((t) => t?.serverId).filter((sid): sid is string => !!sid);
				if (serverIds.length !== trucks.length) {
					console.warn('Waiting for all trucks to sync before updating assay');
					return false;
				}
				payload.linkedTruckIds = serverIds;
			}

			if (assay.linkedDedicatedFleetTruckIds?.length) {
				const ids = assay.linkedDedicatedFleetTruckIds.filter((v): v is string => !!v);
				let dfts = await Promise.all(ids.map((did) => indexedDBService.getRecord('dedicatedFleetTrucks', did)));
				for (const dft of dfts) {
					if (dft && dft.syncStatus !== 'synced') {
						await syncService.syncDedicatedFleetTrucks(dft);
					}
				}
				dfts = await Promise.all(ids.map((did) => indexedDBService.getRecord('dedicatedFleetTrucks', did)));
				const serverIds = dfts.map((d) => d?.serverId).filter((sid): sid is string => !!sid);
				if (serverIds.length !== dfts.length) {
					console.warn('Waiting for all dedicated fleet trucks to sync before updating assay');
					return false;
				}
				payload.linkedDedicatedFleetTruckIds = serverIds;
			}

			if (assay.linkedFleetIds?.length) {
				const ids = assay.linkedFleetIds.filter((v): v is string => !!v);
				let fleets = await Promise.all(ids.map((fid) => indexedDBService.getRecord('fleet', fid)));
				for (const fleet of fleets) {
					if (fleet && fleet.syncStatus !== 'synced') {
						await syncService.syncFleet(fleet);
					}
				}
				fleets = await Promise.all(ids.map((fid) => indexedDBService.getRecord('fleet', fid)));
				const serverIds = fleets.map((f) => f?.serverId).filter((sid): sid is string => !!sid);
				if (serverIds.length !== fleets.length) {
					console.warn('Waiting for all fleets to sync before updating assay');
					return false;
				}
				payload.linkedFleetIds = serverIds;
			}

			if (assay.serverId) {
				const created = await pocketbaseService.update('assays', assay.serverId, { ...payload, user: pocketbaseService.currentUser?.id || '' });
				if (assay.id) {
					await indexedDBService.updateRecord('assays', assay.id, {
						...assay,
						syncStatus: 'synced',
						serverId: created.id,
						siteLocation: assay.siteLocation
					});
				}
			} else {
				const created = await pocketbaseService.create('assays', { ...payload, user: pocketbaseService.currentUser?.id || '' });
				if (assay.id) {
					await indexedDBService.updateRecord('assays', assay.id, {
						...assay,
						syncStatus: 'synced',
						serverId: created.id
					});
				}
			}
			return true;
		} catch (err) {
			console.warn('Failed to sync with PocketBase, will retry later:', err);
			return false;
		}
	},

	async syncPendingAssays() {
		const pending = await indexedDBService.getRecords(
			'assays',
			(rec: { syncStatus: string }) => rec.syncStatus === 'pending'
		);

		for (const assay of pending) {
			await this.syncAssay(assay);
		}
	},

	// ════════════════════════════════════════════════════════════════════════
	// WAGON SYNC METHODS
	// ════════════════════════════════════════════════════════════════════════
	async syncWagon(wagon: Wagon) {
		try {
			const { id, syncStatus, ...payload } = wagon;
			let created;
			if (wagon.serverId) {
				// Update existing record in PocketBase
				created = await pocketbaseService.update('wagons', wagon.serverId, { ...payload, user: pocketbaseService.currentUser?.id || '' });
			} else {
				// Create new record in PocketBase
				created = await pocketbaseService.create('wagons', { ...payload, user: pocketbaseService.currentUser?.id || '' });
			}

			if (wagon.id) {
				await indexedDBService.updateRecord('wagons', wagon.id, {
					...wagon,
					syncStatus: 'synced',
					serverId: created.id
				});
			}
			return true;
		} catch (err) {
			console.warn('Failed to sync wagon with PocketBase:', err);
			return false;
		}
	},

	async syncPendingWagons() {
		const pending = await indexedDBService.getRecords(
			'wagons',
			(rec: { syncStatus: string }) => rec.syncStatus === 'pending'
		);

		for (const wagon of pending) {
			await this.syncWagon(wagon);
		}
	},

	async syncWagonList() {
		try {
			// Calculate date threshold for old records (2 weeks ago)
			const twoWeeksAgo = new Date();
			twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
			const twoWeeksAgoFormatted = twoWeeksAgo.toISOString().split('T')[0]; // yyyy-mm-dd

			// Fetch only records from the last 2 weeks - server-side filtering
			const allWagons = await fetchAllFromPocketBase(
				'wagons',
				1000,
				`created >= "${twoWeeksAgoFormatted}"`
			);
			const allIndexedWagons = await indexedDBService.getRecords('wagons');

			for (const wagon of allWagons) {
				const existingWagon = allIndexedWagons.find(
					(w) => w.serverId === wagon.id || w.id === wagon.wagonId
				);

				if (existingWagon) {
					// Only update if not pending
					if (existingWagon.syncStatus !== 'pending') {
						await indexedDBService.updateRecord('wagons', existingWagon.id, {
							...existingWagon,
							wagonId: wagon.wagonId,
							sampleId: wagon.sampleId,
							wagonIdSimple: wagon.wagonIdSimple,
							transcoreTag: wagon.transcoreTag,
							productType: wagon.productType,
							wagonPhotoUrl: wagon.wagonPhotoUrl,
							dispatchTimestamp: wagon.dispatchTimestamp,
							sampleTimestamp: wagon.sampleTimestamp,
							stagingTimestamp: wagon.stagingTimestamp,
							portSampleTimestamp: wagon.portSampleTimestamp,
							felTimestamp: wagon.felTimestamp,
							releaseTimestamp: wagon.releaseTimestamp,
							trainNumber: wagon.trainNumber,
							loadingLocation: wagon.loadingLocation,
							wagonPosition: wagon.wagonPosition,
							felWeight: wagon.felWeight,
							portSampleId: wagon.portSampleId,
							tarpedStatus: wagon.tarpedStatus,
							serverId: wagon.id,
							syncStatus: 'synced',
							isWireSynced: wagon.isWireSynced,
							created: wagon.created,
							updated: wagon.updated
						});
					}
				} else {
					// Create new record (already filtered by date on server)
					await indexedDBService.saveRecord('wagons', {
						id: wagon.id,
						wagonId: wagon.wagonId,
						sampleId: wagon.sampleId,
						wagonIdSimple: wagon.wagonIdSimple,
						transcoreTag: wagon.transcoreTag,
						productType: wagon.productType,
						wagonPhotoUrl: wagon.wagonPhotoUrl,
						dispatchTimestamp: wagon.dispatchTimestamp,
						sampleTimestamp: wagon.sampleTimestamp,
						stagingTimestamp: wagon.stagingTimestamp,
						portSampleTimestamp: wagon.portSampleTimestamp,
						felTimestamp: wagon.felTimestamp,
						releaseTimestamp: wagon.releaseTimestamp,
						trainNumber: wagon.trainNumber,
						loadingLocation: wagon.loadingLocation,
						wagonPosition: wagon.wagonPosition,
						portSampleId: wagon.portSampleId,
						felWeight: wagon.felWeight,
						tarpedStatus: wagon.tarpedStatus,
						serverId: wagon.id,
						syncStatus: 'synced',
						isWireSynced: wagon.isWireSynced,
						user: pocketbaseService.currentUser?.id || '',
						created: wagon.created,
						updated: wagon.updated
					});
				}
			}
			return true;
		} catch (err: any) {
			if (!err?.message?.includes('autocancelled')) {
				console.error('❌ Failed to sync wagon list:', err);
			}
			return false;
		}
	},

	// ════════════════════════════════════════════════════════════════════════
	// TRUCK SYNC METHODS
	// ════════════════════════════════════════════════════════════════════════
	async syncTruckList() {
		try {
			// Fetch only records from the last 2 weeks - server-side filtering
			const allTrucks = await fetchAllFromPocketBase('trucks', 1000);
			const allIndexedTrucks = await indexedDBService.getRecords('trucks');

			for (const truck of allTrucks) {
				// Match on either serverId or local id
				const existingTruck = allIndexedTrucks.find(
					(t) => t.serverId === truck.id || t.id === truck.id
				);

				if (existingTruck) {
					// Only update if not pending
					if (existingTruck.syncStatus !== 'pending') {
						await indexedDBService.updateRecord('trucks', existingTruck.id, {
							...existingTruck,
							registration: truck.registration,
							loadingLocation: truck.loadingLocation,
							syncStatus: 'synced',
							productType: truck.productType,
							serverId: truck.id,
							tareTimestamp: truck.tareTimestamp,
							transRef: truck.transRef,
							created: truck.created,
							updated: truck.updated
						});
					}
				} else {
					// Create new record (already filtered by date on server)
					await indexedDBService.saveRecord('trucks', {
						id: truck.id,
						registration: truck.registration,
						loadingLocation: truck.loadingLocation,
						syncStatus: 'synced',
						productType: truck.productType,
						serverId: truck.id,
						tareTimestamp: truck.tareTimestamp,
						transRef: truck.transRef,
						created: truck.created,
						updated: truck.updated
					});
				}
			}
			return true;
		} catch (err: any) {
			if (!err?.message?.includes('autocancelled')) {
				console.error('❌ Failed to sync truck list:', err);
			}
			return false;
		}
	},

	async syncTruck(truck: Truck) {
		try {
			const { id, syncStatus, ...payload } = truck;

			let created;
			if (truck.serverId) {
				created = await pocketbaseService.update('trucks', truck.serverId, payload);
			} else {
				created = await pocketbaseService.create('trucks', payload);
			}

			if (truck.id) {
				await indexedDBService.updateRecord('trucks', truck.id, {
					...truck,
					syncStatus: 'synced',
					serverId: created.id
				});
			}
			return true;
		} catch (err) {
			console.warn('Failed to sync truck with PocketBase:', err);
			return false;
		}
	},

	async syncPendingTrucks() {
		const pending = await indexedDBService.getRecords(
			'trucks',
			(rec: { syncStatus: string }) => rec.syncStatus === 'pending'
		);

		for (const truck of pending) {
			await this.syncTruck(truck);
		}
	},

	// ════════════════════════════════════════════════════════════════════════
	// TRAIN SYNC METHODS
	// ════════════════════════════════════════════════════════════════════════
	async syncTrainList() {
		try {
			// Fetch all trains from Pocketbase (no date filter)
			const allTrains = await fetchAllFromPocketBase('trains', 1000);
			const allIndexedTrains = await indexedDBService.getRecords('trains');

			for (const train of allTrains) {
				const existingTrain = allIndexedTrains.find(
					(t) => t.serverId === train.id || t.id === train.id
				);

				if (existingTrain) {
					// Only update if not pending
					if (existingTrain.syncStatus !== 'pending') {
						await indexedDBService.updateRecord('trains', existingTrain.id, {
							...existingTrain,
							refNr: train.refNr,
							rfidNr: train.rfidNr,
							syncStatus: 'synced',
							serverId: train.id,
							created: train.created,
							updated: train.updated
						});
					}
				} else {
					// Create new record (already filtered by date on server)
					await indexedDBService.saveRecord('trains', {
						id: train.id,
						refNr: train.refNr,
						rfidNr: train.rfidNr,
						syncStatus: 'synced',
						serverId: train.id,
						created: train.created,
						updated: train.updated
					});
				}
			}
			return true;
		} catch (err: any) {
			if (!err?.message?.includes('autocancelled')) {
				console.error('❌ Failed to sync train list:', err);
			}
			return false;
		}
	},

	// ════════════════════════════════════════════════════════════════════════
	// CONSIGNMENT SYNC METHODS
	// ════════════════════════════════════════════════════════════════════════
	async syncConsignmentList() {
		try {
			// Fetch all consignments from Pocketbase (no date filter)
			const allConsignments = await fetchAllFromPocketBase('consignments', 1000);
			const allIndexedConsignments = await indexedDBService.getRecords('consignments');

			for (const consignment of allConsignments) {
				const existingConsignment = allIndexedConsignments.find(
					(c) => c.serverId === consignment.id || c.id === consignment.id
				);

				if (existingConsignment) {
					// Only update if not pending
					if (existingConsignment.syncStatus !== 'pending') {
						await indexedDBService.updateRecord('consignments', existingConsignment.id, {
							...existingConsignment,
							name: consignment.name,
							linkedTrainId: consignment.linkedTrainId,
							syncStatus: 'synced',
							serverId: consignment.id,
							siteLocation: consignment.siteLocation,
							isWireSynced: consignment.isWireSynced,
							created: consignment.created,
							updated: consignment.updated
						});
					}
				} else {
					// Create new record (already filtered by date on server)
					await indexedDBService.saveRecord('consignments', {
						id: consignment.id,
						name: consignment.name,
						linkedTrainId: consignment.linkedTrainId,
						syncStatus: 'synced',
						serverId: consignment.id,
						siteLocation: consignment.siteLocation,
						isWireSynced: consignment.isWireSynced,
						created: consignment.created,
						updated: consignment.updated
					});
				}
			}
			return true;
		} catch (err: any) {
			if (!err?.message?.includes('autocancelled')) {
				console.error('❌ Failed to sync consignment list:', err);
			}
			return false;
		}
	},

	async syncConsignment(consignment: Consignment) {
		try {
			const { id, syncStatus, ...payload } = consignment;

			let created;
			if (consignment.serverId) {
				created = await pocketbaseService.update('consignments', consignment.serverId, {
					...payload,
					user: pocketbaseService.currentUser?.id || ''
				});
			} else {
				created = await pocketbaseService.create('consignments', {
					...payload,
					user: pocketbaseService.currentUser?.id || ''
				});
			}

			if (consignment.id) {
				await indexedDBService.updateRecord('consignments', consignment.id, {
					...consignment,
					syncStatus: 'synced',
					serverId: created.id
				});
			}

			return true;
		} catch (err) {
			console.warn('Failed to sync consignment with PocketBase:', err);
			return false;
		}
	},

	async syncPendingConsignments() {
		const pending = await indexedDBService.getRecords(
			'consignments',
			(rec: { syncStatus: string }) => rec.syncStatus === 'pending'
		);

		for (const consignment of pending) {
			await this.syncConsignment(consignment);
		}
	},

	// ════════════════════════════════════════════════════════════════════════
	// TRUCK LOAD SYNC METHODS
	// ════════════════════════════════════════════════════════════════════════
	async syncTruckLoadList() {
		try {
			// Calculate date threshold for old records (2 weeks ago)
			const twoWeeksAgo = new Date();
			twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
			const twoWeeksAgoFormatted = twoWeeksAgo.toISOString().split('T')[0]; // yyyy-mm-dd

			// Fetch only records from the last 2 weeks - server-side filtering
			const allTruckLoads = await fetchAllFromPocketBase(
				'truckLoads',
				1000,
				`created >= "${twoWeeksAgoFormatted}"`
			);
			const allIndexedTruckLoads = await indexedDBService.getRecords('truckLoads');

			for (const truckLoad of allTruckLoads) {
				// Only match on serverId to avoid duplicates
				const existingTruckLoad = allIndexedTruckLoads.find(
					(t) => t.serverId === truckLoad.id || t.id === truckLoad.id
				);

				if (existingTruckLoad) {
					// Only update if not pending
					if (existingTruckLoad.syncStatus !== 'pending') {
						await indexedDBService.updateRecord('truckLoads', existingTruckLoad.id, {
							...existingTruckLoad,
							process: truckLoad.process,
							truckId: truckLoad.truckId,
							felWeight: truckLoad.felWeight,
							samplingStatus: truckLoad.samplingStatus,
							loadingLocation: truckLoad.loadingLocation,
							tankLocation: truckLoad.tankLocation,
							loadingHour: truckLoad.loadingHour,
							acidType: truckLoad.acidType,
							materialType: truckLoad.materialType,
							sampleId: truckLoad.sampleId,
							created: truckLoad.created,
							updated: truckLoad.updated,
							syncStatus: 'synced',
							serverId: truckLoad.id,
							isWireSynced: truckLoad.isWireSynced,
							siteLocation: truckLoad.siteLocation
						});
					}
				} else {
					// Create new record (already filtered by date on server)
					await indexedDBService.saveRecord('truckLoads', {
						id: truckLoad.id,
						process: truckLoad.process,
						truckId: truckLoad.truckId,
						felWeight: truckLoad.felWeight,
						samplingStatus: truckLoad.samplingStatus,
						loadingLocation: truckLoad.loadingLocation,
						tankLocation: truckLoad.tankLocation,
						loadingHour: truckLoad.loadingHour,
						acidType: truckLoad.acidType,
						materialType: truckLoad.materialType,
						sampleId: truckLoad.sampleId,
						created: truckLoad.created,
						updated: truckLoad.updated,
						syncStatus: 'synced',
						serverId: truckLoad.id,
						user: pocketbaseService.currentUser?.id || '',
						isWireSynced: truckLoad.isWireSynced,
						siteLocation: truckLoad.siteLocation
					});
				}
			}
			return true;
		} catch (err: any) {
			if (!err?.message?.includes('autocancelled')) {
				console.error('❌ Failed to sync truck load list:', err);
			}
			return false;
		}
	},

	async syncTruckLoad(truckLoad: TruckLoad) {
		try {
			const { id, syncStatus, ...payload } = truckLoad;

			let created;
			if (truckLoad.serverId) {
				created = await pocketbaseService.update('truckLoads', truckLoad.serverId, { ...payload, user: pocketbaseService.currentUser?.id || '' });
			} else {
				created = await pocketbaseService.create('truckLoads', { ...payload, user: pocketbaseService.currentUser?.id || '' });
			}

			if (truckLoad.id) {
				await indexedDBService.updateRecord('truckLoads', truckLoad.id, {
					...truckLoad,
					syncStatus: 'synced',
					serverId: created.id
				});
			}
			return true;
		} catch (err) {
			console.warn('Failed to sync truck load with PocketBase:', err);
			return false;
		}
	},

	async syncPendingTruckLoads() {
		const pending = await indexedDBService.getRecords(
			'truckLoads',
			(rec: { syncStatus: string }) => rec.syncStatus === 'pending'
		);

		for (const truckLoad of pending) {
			await this.syncTruckLoad(truckLoad);
		}
	},

	// ════════════════════════════════════════════════════════════════════════
	// TRAIN DISPATCH SYNC METHODS
	// ════════════════════════════════════════════════════════════════════════
	async syncTrainDispatchList() {
		try {
			// Calculate date threshold for old records (2 weeks ago)
			const twoWeeksAgo = new Date();
			twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
			const twoWeeksAgoFormatted = twoWeeksAgo.toISOString().split('T')[0]; // yyyy-mm-dd

			// Fetch only records from the last 2 weeks - server-side filtering
			const allTrainDispatches = await fetchAllFromPocketBase(
				'trainDispatches',
				1000,
				`created >= "${twoWeeksAgoFormatted}"`
			);
			const allIndexedTrainDispatches = await indexedDBService.getRecords('trainDispatches');

			for (const trainDispatch of allTrainDispatches) {
				const existingTrainDispatch = allIndexedTrainDispatches.find(
					(t) => t.serverId === trainDispatch.id || t.id === trainDispatch.id
				);

				if (existingTrainDispatch) {
					// Only update if not pending
					if (existingTrainDispatch.syncStatus !== 'pending') {
						await indexedDBService.updateRecord('trainDispatches', existingTrainDispatch.id, {
							...existingTrainDispatch,
							linkedTrainId: trainDispatch.linkedTrainId,
							linkedConsignmentId: trainDispatch.linkedConsignmentId,
							linkedWagonIds: trainDispatch.linkedWagonIds,
							process: trainDispatch.process,
							siteLocation: trainDispatch.siteLocation,
							dispatchTimestamp: trainDispatch.dispatchTimestamp,
							syncStatus: 'synced',
							isWireSynced: trainDispatch.isWireSynced,
							serverId: trainDispatch.id,
							created: trainDispatch.created,
							updated: trainDispatch.updated
						});
					}
				} else {
					// Create new record (already filtered by date on server)
					await indexedDBService.saveRecord('trainDispatches', {
						id: trainDispatch.id,
						linkedTrainId: trainDispatch.linkedTrainId,
						linkedConsignmentId: trainDispatch.linkedConsignmentId,
						linkedWagonIds: trainDispatch.linkedWagonIds,
						process: trainDispatch.process,
						siteLocation: trainDispatch.siteLocation,
						dispatchTimestamp: trainDispatch.dispatchTimestamp,
						syncStatus: 'synced',
						isWireSynced: trainDispatch.isWireSynced,
						serverId: trainDispatch.id,
						user: pocketbaseService.currentUser?.id || '',
						created: trainDispatch.created,
						updated: trainDispatch.updated
					});
				}
			}
			return true;
		} catch (err: any) {
			if (!err?.message?.includes('autocancelled')) {
				console.error('❌ Failed to sync train dispatch list:', err);
			}
			return false;
		}
	},

	async syncTrainDispatch(trainDispatch: TrainDispatch) {
		try {
			const { id, syncStatus, ...payload } = trainDispatch;

			let created;
			if (trainDispatch.serverId) {
				// Check all linked wagons have server IDs before updating
				if (trainDispatch.linkedWagonIds?.length) {
					const wagons = await Promise.all(
						trainDispatch.linkedWagonIds.map((id) => indexedDBService.getRecord('wagons', id))
					);

					// Sync any wagons that do not have a serverId
					for (const wagon of wagons) {
						if (wagon && !wagon.serverId) {
							await syncService.syncWagon(wagon);
						}
					}

					// Re-fetch wagons after syncing
					const syncedWagons = await Promise.all(
						trainDispatch.linkedWagonIds.map((id) => indexedDBService.getRecord('wagons', id))
					);
					const allWagonsHaveServerId = syncedWagons.every((wagon) => wagon?.serverId);
					if (!allWagonsHaveServerId) {
						console.warn('Waiting for all wagons to sync before updating train dispatch');
						return false;
					}

					// Replace local IDs with server IDs
					payload.linkedWagonIds = syncedWagons
						.map((wagon) => wagon?.serverId)
						.filter((id): id is string => id !== undefined);
				}
				if (payload.linkedConsignmentId) {
					const consignment = await indexedDBService.getRecord(
						'consignments',
						payload.linkedConsignmentId
					);
					if (consignment?.serverId) {
						payload.linkedConsignmentId = consignment.serverId;
					}
				}
				created = await pocketbaseService.update(
					'trainDispatches',
					trainDispatch.serverId,
					{ ...payload, user: pocketbaseService.currentUser?.id || '' }
				);
			} else {
				if (payload.linkedWagonIds?.length) {
					const wagons = await Promise.all(
						payload.linkedWagonIds.map((id) => indexedDBService.getRecord('wagons', id))
					);

					const allWagonsHaveServerId = wagons.every((wagon) => wagon?.serverId);
					if (!allWagonsHaveServerId) {
						console.warn('Waiting for all wagons to sync before creating assay');
						return false;
					}

					payload.linkedWagonIds = wagons
						.map((wagon) => wagon?.serverId)
						.filter((id): id is string => id !== undefined);
				}

				if (payload.linkedConsignmentId) {
					const consignment = await indexedDBService.getRecord(
						'consignments',
						payload.linkedConsignmentId
					);
					if (consignment?.serverId) {
						payload.linkedConsignmentId = consignment.serverId;
					}
				}
				created = await pocketbaseService.create('trainDispatches', { ...payload, user: pocketbaseService.currentUser?.id || '' });
			}

			if (trainDispatch.id) {
				await indexedDBService.updateRecord('trainDispatches', trainDispatch.id, {
					...trainDispatch,
					syncStatus: 'synced',
					serverId: created.id
				});
			}
			return true;
		} catch (err) {
			console.warn('Failed to sync train dispatch with PocketBase:', err);
			return false;
		}
	},

	async syncPendingTrainDispatches() {
		const pending = await indexedDBService.getRecords(
			'trainDispatches',
			(rec: { syncStatus: string }) => rec.syncStatus === 'pending'
		);

		for (const trainDispatch of pending) {
			await this.syncTrainDispatch(trainDispatch);
		}
	},

	// ════════════════════════════════════════════════════════════════════════
	// SHUNTING TRAIN SYNC METHODS
	// ════════════════════════════════════════════════════════════════════════
	async syncShuntingTrain(shuntingTrain: ShuntingTrain) {
		try {
			const { id, syncStatus, ...payload } = shuntingTrain;

			// Since shunting train always exists in PocketBase, we only update
			if (shuntingTrain.id) {
				// Check all linked wagons have server IDs before updating
				if (shuntingTrain.linkedWagons?.length) {
					const wagons = await Promise.all(
						shuntingTrain.linkedWagons.map((id) => indexedDBService.getRecord('wagons', id))
					);

					// Check if all wagons have server IDs (most will, but new ones might not)
					const allWagonsHaveServerId = wagons.every((wagon) => wagon?.serverId);
					if (!allWagonsHaveServerId) {
						console.warn('Waiting for all wagons to sync before updating shunting train');
						return false;
					}

					// Replace local IDs with server IDs
					payload.linkedWagons = wagons
						.map((wagon) => wagon?.serverId)
						.filter((id): id is string => id !== undefined);
				}

				// Update existing record in PocketBase
				const updated = await pocketbaseService.update('shuntingTrains', shuntingTrain.id, { ...payload, user: pocketbaseService.currentUser?.id || '' });

				if (shuntingTrain.id) {
					await indexedDBService.updateRecord('shuntingTrains', shuntingTrain.id, {
						...shuntingTrain,
						syncStatus: 'synced',
						id: updated.id
					});
				}
			} else {
				// This case should be rare since shunting trains always exist in PocketBase
				console.warn('ShuntingTrain missing serverId - this should not happen normally');
				return false;
			}
			return true;
		} catch (err) {
			console.warn('Failed to sync shunting train with PocketBase, will retry later:', err);
			return false;
		}
	},

	async syncPendingShuntingTrains() {
		const pending = await indexedDBService.getRecords(
			'shuntingTrains',
			(rec: { syncStatus: string }) => rec.syncStatus === 'pending'
		);

		for (const shuntingTrain of pending) {
			await this.syncShuntingTrain(shuntingTrain);
		}
	},

	async syncShuntingTrainList() {
		try {
			// Calculate date threshold for old records (2 weeks ago)
			const twoWeeksAgo = new Date();
			twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
			const twoWeeksAgoFormatted = twoWeeksAgo.toISOString().split('T')[0]; // yyyy-mm-dd

			// Fetch only records from the last 2 weeks - server-side filtering
			const allShuntingTrains = await fetchAllFromPocketBase(
				'shuntingTrains',
				1000,
				`created >= "${twoWeeksAgoFormatted}"`
			);
			const allIndexedShuntingTrains = await indexedDBService.getRecords('shuntingTrains');

			for (const train of allShuntingTrains) {
				const existingShuntingTrain = allIndexedShuntingTrains.find(
					(t) => t.serverId === train.id || t.id === train.id
				);

				if (existingShuntingTrain) {
					// Only update if not pending
					if (existingShuntingTrain.syncStatus !== 'pending') {
						await indexedDBService.updateRecord('shuntingTrains', existingShuntingTrain.id, {
							...existingShuntingTrain,
							postDate: train.postDate,
							linkedWagons: train.linkedWagons,
							verificationTimestamp: train.verificationTimestamp,
							finishSamplingTimestamp: train.finishSamplingTimestamp,
							finishFELOperationTimestamp: train.finishFELOperationTimestamp,
							siteLocation: train.siteLocation,
							serverId: train.id,
							syncStatus: 'synced',
							isWireSynced: train.isWireSynced,
							created: train.created,
							updated: train.updated
						});
					}
				} else {
					// Create new record (already filtered by date on server)
					await indexedDBService.saveRecord('shuntingTrains', {
						id: train.id,
						postDate: train.postDate,
						linkedWagons: train.linkedWagons,
						verificationTimestamp: train.verificationTimestamp,
						finishSamplingTimestamp: train.finishSamplingTimestamp,
						finishFELOperationTimestamp: train.finishFELOperationTimestamp,
						siteLocation: train.siteLocation,
						serverId: train.id,
						syncStatus: 'synced',
						isWireSynced: train.isWireSynced,
						user: pocketbaseService.currentUser?.id || '',
						created: train.created,
						updated: train.updated
					});
				}
			}
			return true;
		} catch (err: any) {
			if (!err?.message?.includes('autocancelled')) {
				console.error('❌ Failed to sync shunting train list:', err);
			}
			return false;
		}
	},

	// ════════════════════════════════════════════════════════════════════════
	// TRUCK ARRIVAL SYNC METHODS
	// ════════════════════════════════════════════════════════════════════════
	async syncTruckArrival(truckArrival: TruckArrival) {
		try {
			const { id, syncStatus, ...payload } = truckArrival;

			let created;

			// Prepare a payload for PocketBase
			let apiPayload: any = { ...payload };

			// Convert base64 to Blob for PocketBase file upload
			if (
				payload.truck_photo &&
				typeof payload.truck_photo === 'string' &&
				payload.truck_photo.startsWith('data:')
			) {
				const [meta] = payload.truck_photo.split(',');
				const mime = meta.match(/data:(.*);base64/)?.[1] || 'image/webp';
				apiPayload.truck_photo = base64ToBlob(payload.truck_photo, mime);
			}

			if (truckArrival.serverId) {
				// Check for linked truck
				if (truckArrival.truckId) {
					const linkedTruck = await indexedDBService.getRecord('trucks', truckArrival.truckId);
					// Check if linked truck has serverId
					if (!linkedTruck?.serverId) {
						console.warn(`Waiting for truck to sync before updating truck arrival`);
					}
					apiPayload.truckId = linkedTruck?.serverId;
				}
				if (apiPayload.truckId) {
					const trucks = await indexedDBService.getRecord('trucks', apiPayload.truckId);
					if (trucks?.serverId) {
						apiPayload.truckId = trucks.serverId;
					}
				}

				if (truckArrival.dedicatedTruckId) {
					const dedicatedLinkedTruck = await indexedDBService.getRecord('dedicatedFleetTrucks', truckArrival.dedicatedTruckId);
					// Check if linked truck has serverId
					if (!dedicatedLinkedTruck?.serverId) {
						console.warn(`Waiting for truck to sync before updating truck arrival`);
					}
					apiPayload.dedicatedTruckId = dedicatedLinkedTruck?.serverId;
				}
				if (apiPayload.dedicatedTruckId) {
					const trucks = await indexedDBService.getRecord('dedicatedFleetTrucks', apiPayload.dedicatedTruckId);
					if (trucks?.serverId) {
						apiPayload.dedicatedTruckId = trucks.serverId;
					}
				}

				created = await pocketbaseService.update(
					'truckArrivals',
					truckArrival.serverId,
					{ ...apiPayload, user: pocketbaseService.currentUser?.id || '' }
				);
			} else {
				if (apiPayload.truckId?.length) {
					const linkedTruck = await indexedDBService.getRecord('trucks', apiPayload.truckId);

					if (!linkedTruck?.serverId) {
						console.warn(`Waiting for truck to sync before creating truck arrival`);
						return false;
					}
					apiPayload.truckId = linkedTruck.serverId;
				}
				if (apiPayload.truckId) {
					const trucks = await indexedDBService.getRecord('trucks', apiPayload.truckId);
					if (trucks?.serverId) {
						apiPayload.truckId = trucks.serverId;
					}
				}

				if (truckArrival.dedicatedTruckId) {
					const dedicatedLinkedTruck = await indexedDBService.getRecord('dedicatedFleetTrucks', truckArrival.dedicatedTruckId);
					// Check if linked truck has serverId
					if (!dedicatedLinkedTruck?.serverId) {
						console.warn(`Waiting for truck to sync before updating truck arrival`);
					}
					apiPayload.dedicatedTruckId = dedicatedLinkedTruck?.serverId;
				}
				if (apiPayload.dedicatedTruckId) {
					const trucks = await indexedDBService.getRecord('dedicatedFleetTrucks', apiPayload.dedicatedTruckId);
					if (trucks?.serverId) {
						apiPayload.dedicatedTruckId = trucks.serverId;
					}
				}

				created = await pocketbaseService.create('truckArrivals', { ...apiPayload, user: pocketbaseService.currentUser?.id || '' });
			}

			if (truckArrival.id) {
				await indexedDBService.updateRecord('truckArrivals', truckArrival.id, {
					...truckArrival,
					syncStatus: 'synced',
					serverId: created.id
				});
			}
			return true;
		} catch (err) {
			console.warn('Failed to sync truck arrival with PocketBase, will retry later:', err);
			return false;
		}
	},

	async syncPendingTruckArrivals() {
		const pending = await indexedDBService.getRecords(
			'truckArrivals',
			(record: TruckArrival) => record.syncStatus === 'pending'
		);

		for (const truckArrival of pending) {
			await this.syncTruckArrival(truckArrival);
		}
	},

	async syncTruckArrivalList() {
		try {
			// Calculate date threshold for old records (2 weeks ago)
			const twoWeeksAgo = new Date();
			twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
			const twoWeeksAgoFormatted = twoWeeksAgo.toISOString().split('T')[0]; // yyyy-mm-dd

			// Fetch only records from the last 2 weeks - server-side filtering
			const allTruckArrivals = await fetchAllFromPocketBase(
				'truckArrivals',
				1000,
				`created >= "${twoWeeksAgoFormatted}"`
			);
			const allIndexedTruckArrivals = await indexedDBService.getRecords('truckArrivals');

			for (const arrival of allTruckArrivals) {
				const existingTruckArrival = allIndexedTruckArrivals.find(
					(t) => t.serverId === arrival.id || t.id === arrival.id
				);

				if (existingTruckArrival) {
					// Only update if not pending
					if (existingTruckArrival.syncStatus !== 'pending') {
						await indexedDBService.updateRecord('truckArrivals', existingTruckArrival.id, {
							...existingTruckArrival,
							truckId: arrival.truckId,
							dedicatedTruckId: arrival.dedicatedTruckId,
							port_arrival_sample_id: arrival.port_arrival_sample_id,
							truck_photo: arrival.truck_photo,
							port_truck_arrival_timestamp: arrival.port_truck_arrival_timestamp,
							status: arrival.status,
							transporter: arrival.transporter,
							truck_commodity: arrival.truck_commodity,
							gross_measured_kg: arrival.gross_measured_kg,
							gross_timestamp: arrival.gross_timestamp,
							tare_stored_kg: arrival.tare_stored_kg,
							tare_timestamp: arrival.tare_timestamp,
							truck_origin_location: arrival.truck_origin_location,
							syncStatus: 'synced',
							siteLocation: arrival.siteLocation,
							name: arrival.name,
							registration: arrival.registration,
							isWireSynced: arrival.isWireSynced,
							created: arrival.created,
							updated: arrival.updated,
							serverId: arrival.id
						});
					}
				} else {
					// Create new record (already filtered by date on server)
					await indexedDBService.saveRecord('truckArrivals', {
						id: arrival.id,
						truckId: arrival.truckId,
						dedicatedTruckId: arrival.dedicatedTruckId,
						port_arrival_sample_id: arrival.port_arrival_sample_id,
						truck_photo: arrival.truck_photo,
						port_truck_arrival_timestamp: arrival.port_truck_arrival_timestamp,
						status: arrival.status,
						transporter: arrival.transporter,
						truck_commodity: arrival.truck_commodity,
						gross_measured_kg: arrival.gross_measured_kg,
						gross_timestamp: arrival.gross_timestamp,
						tare_stored_kg: arrival.tare_stored_kg,
						tare_timestamp: arrival.tare_timestamp,
						truck_origin_location: arrival.truck_origin_location,
						syncStatus: 'synced',
						siteLocation: arrival.siteLocation,
						name: arrival.name,
						registration: arrival.registration,
						isWireSynced: arrival.isWireSynced,
						created: arrival.created,
						updated: arrival.updated,
						serverId: arrival.id,
						user: pocketbaseService.currentUser?.id || ''
					});
				}
			}
			return true;
		} catch (err: any) {
			console.error('❌ Failed to sync truck arrival list:', err.message, err.stack);
			return false;
		}
	},

	// ════════════════════════════════════════════════════════════════════════
	// TRAIN ARRIVAL SYNC METHODS
	// ════════════════════════════════════════════════════════════════════════
	async syncTrainArrivalList() {
		try {
			// Calculate date threshold for old records (2 weeks ago)
			const twoWeeksAgo = new Date();
			twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
			const twoWeeksAgoFormatted = twoWeeksAgo.toISOString().split('T')[0]; // yyyy-mm-dd

			// Fetch only records from the last 2 weeks - server-side filtering
			const allTrainArrivals = await fetchAllFromPocketBase(
				'trainArrivals',
				1000,
				`created >= "${twoWeeksAgoFormatted}"`
			);
			const allIndexedTrainArrivals = await indexedDBService.getRecords('trainArrivals');

			for (const trainArrival of allTrainArrivals) {
				const existingTrainArrival = allIndexedTrainArrivals.find(
					(t) => t.serverId === trainArrival.id || t.id === trainArrival.id
				);

				if (existingTrainArrival) {
					// Only update if not pending
					if (existingTrainArrival.syncStatus !== 'pending') {
						await indexedDBService.updateRecord('trainArrivals', existingTrainArrival.id, {
							...existingTrainArrival,
							portRailArrivalTimestamp: trainArrival.portRailArrivalTimestamp,
							portStagingTimestamp: trainArrival.portStagingTimestamp,
							finishSamplingTimestamp: trainArrival.finishSamplingTimestamp,
							trainPhotoUrl: trainArrival.trainPhotoUrl,
							status: trainArrival.status,
							trainId: trainArrival.trainId,
							siteLocation: trainArrival.siteLocation,
							linkedWagonIds: trainArrival.linkedWagonIds,
							comment: trainArrival.comment,
							syncStatus: 'synced',
							serverId: trainArrival.id,
							isWireSynced: trainArrival.isWireSynced,
							created: trainArrival.created,
							updated: trainArrival.updated
						});
					}
				} else {
					// Create new record (already filtered by date on server)
					await indexedDBService.saveRecord('trainArrivals', {
						id: trainArrival.id,
						portRailArrivalTimestamp: trainArrival.portRailArrivalTimestamp,
						portStagingTimestamp: trainArrival.portStagingTimestamp,
						finishSamplingTimestamp: trainArrival.finishSamplingTimestamp,
						trainPhotoUrl: trainArrival.trainPhotoUrl,
						status: trainArrival.status,
						trainId: trainArrival.trainId,
						siteLocation: trainArrival.siteLocation,
						linkedWagonIds: trainArrival.linkedWagonIds,
						comment: trainArrival.comment,
						syncStatus: 'synced',
						serverId: trainArrival.id,
						isWireSynced: trainArrival.isWireSynced,
						user: pocketbaseService.currentUser?.id || '',
						created: trainArrival.created,
						updated: trainArrival.updated
					});
				}
			}
			return true;
		} catch (err: any) {
			if (!err?.message?.includes('autocancelled')) {
				console.error('❌ Failed to sync train arrival list:', err);
			}
			return false;
		}
	},

	async syncTrainArrival(trainArrival: TrainArrival) {
		try {
			const { id, syncStatus, ...payload } = trainArrival;

			let created;
			// Prepare a payload for PocketBase with Blob if needed
			let apiPayload: any = { ...payload };

			// Convert base64 to Blob for PocketBase file upload
			if (
				payload.trainPhotoUrl &&
				typeof payload.trainPhotoUrl === 'string' &&
				payload.trainPhotoUrl.startsWith('data:')
			) {
				const [meta] = payload.trainPhotoUrl.split(',');
				const mime = meta.match(/data:(.*);base64/)?.[1] || 'image/webp';
				apiPayload.trainPhotoUrl = base64ToBlob(payload.trainPhotoUrl, mime);
			}

			if (trainArrival.serverId) {
				// Check for linked train
				if (trainArrival.trainId) {
					const linkedTrain = await indexedDBService.getRecord('trains', trainArrival.trainId);
					if (!linkedTrain?.serverId) {
						console.warn(`Waiting for train to sync before updating train arrival`);
						return false;
					}
					apiPayload.trainId = linkedTrain?.serverId;
				}
				if (apiPayload.trainId) {
					const trains = await indexedDBService.getRecord('trains', apiPayload.trainId);
					if (trains?.serverId) {
						apiPayload.trainId = trains.serverId;
					}
				}
				created = await pocketbaseService.update(
					'trainArrivals',
					trainArrival.serverId,
					{ ...apiPayload, user: pocketbaseService.currentUser?.id || '' }
				);
			} else {
				if (apiPayload.trainId?.length) {
					const linkedTrain = await indexedDBService.getRecord('trains', apiPayload.trainId);
					if (!linkedTrain?.serverId) {
						console.warn(`Waiting for train to sync before creating train arrival`);
						return false;
					}
					apiPayload.trainId = linkedTrain.serverId;
				}
				if (apiPayload.trainId) {
					const trains = await indexedDBService.getRecord('trains', apiPayload.trainId);
					if (trains?.serverId) {
						apiPayload.trainId = trains.serverId;
					}
				}
				created = await pocketbaseService.create('trainArrivals', { ...apiPayload, user: pocketbaseService.currentUser?.id || '' });
			}

			if (trainArrival.id) {
				await indexedDBService.updateRecord('trainArrivals', trainArrival.id, {
					...trainArrival,
					syncStatus: 'synced',
					serverId: created.id
				});
			}
			return true;
		} catch (err) {
			console.warn('Failed to sync train arrival with PocketBase, will retry later:', err);
			return false;
		}
	},

	async syncPendingTrainArrivals() {
		const pending = await indexedDBService.getRecords(
			'trainArrivals',
			(rec: { syncStatus: string }) => rec.syncStatus === 'pending'
		);

		for (const trainArrival of pending) {
			await this.syncTrainArrival(trainArrival);
		}
	},

	// ════════════════════════════════════════════════════════════════════════
	// FLEET SYNC METHODS
	// ════════════════════════════════════════════════════════════════════════
	async syncFleetList() {
		try {
			// Calculate date threshold for old records (2 weeks ago)
			const twoWeeksAgo = new Date();
			twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
			const twoWeeksAgoFormatted = twoWeeksAgo.toISOString().split('T')[0]; // yyyy-mm-dd

			// Fetch only records from the last 2 weeks - server-side filtering
			const allFleets = await fetchAllFromPocketBase(
				'fleet',
				1000,
				`created >= "${twoWeeksAgoFormatted}"`
			);
			const allIndexedFleets = await indexedDBService.getRecords('fleet');

			for (const fleet of allFleets) {
				// Only match on serverId to avoid duplicates
				const existingFleet = allIndexedFleets.find(
					(f) => f.serverId === fleet.id || f.id === fleet.id
				);

				if (existingFleet) {
					// Only update if not pending
					if (existingFleet.syncStatus !== 'pending') {
						await indexedDBService.updateRecord('fleet', existingFleet.id, {
							...existingFleet,
							sampleId: fleet.sampleId,
							sampleNumber: fleet.sampleNumber,
							commodity: fleet.commodity,
							truckDestination: fleet.truckDestination,
							materialType: fleet.materialType,
							loadingLocation: fleet.loadingLocation,
							loadingHour: fleet.loadingHour,
							registration: fleet.registration,
							samplingStatus: fleet.samplingStatus,
							felMassKg: fleet.felMassKg,
							siteLocation: fleet.siteLocation,
							syncStatus: 'synced',
							serverId: fleet.id,
							isWireSynced: fleet.isWireSynced,
							created: fleet.created,
							updated: fleet.updated
						});
					}
				} else {
					// Create new record (already filtered by date on server)
					await indexedDBService.saveRecord('fleet', {
						id: fleet.id,
						sampleId: fleet.sampleId,
						sampleNumber: fleet.sampleNumber,
						commodity: fleet.commodity,
						truckDestination: fleet.truckDestination,
						materialType: fleet.materialType,
						loadingLocation: fleet.loadingLocation,
						loadingHour: fleet.loadingHour,
						registration: fleet.registration,
						samplingStatus: fleet.samplingStatus,
						felMassKg: fleet.felMassKg,
						siteLocation: fleet.siteLocation,
						syncStatus: 'synced',
						serverId: fleet.id,
						isWireSynced: fleet.isWireSynced,
						user: pocketbaseService.currentUser?.id || '',
						created: fleet.created,
						updated: fleet.updated
					});
				}
			}
			return true;
		} catch (err: any) {
			if (!err?.message?.includes('autocancelled')) {
				console.error('❌ Failed to sync fleet list:', err);
			}
			return false;
		}
	},

	async syncFleet(fleet: Fleet) {
		try {
			const { id, syncStatus, ...payload } = fleet;

			let created;
			if (fleet.serverId) {
				created = await pocketbaseService.update('fleet', fleet.serverId, { ...payload, user: pocketbaseService.currentUser?.id || '' });
			} else {
				created = await pocketbaseService.create('fleet', { ...payload, user: pocketbaseService.currentUser?.id || '' });
			}

			if (fleet.id) {
				await indexedDBService.updateRecord('fleet', fleet.id, {
					...fleet,
					syncStatus: 'synced',
					serverId: created.id
				});
			}
			return true;
		} catch (err) {
			console.warn('Failed to sync fleet with PocketBase:', err);
			return false;
		}
	},

	async syncPendingFleet() {
		const pending = await indexedDBService.getRecords(
			'fleet',
			(rec: { syncStatus: string }) => rec.syncStatus === 'pending'
		);

		for (const fleet of pending) {
			await this.syncFleet(fleet);
		}
	},

	// ════════════════════════════════════════════════════════════════════════
	// DEDICATED FLEET TRUCK SYNC METHODS
	// ════════════════════════════════════════════════════════════════════════
	async syncDedicatedFleetTrucks(dedicatedFleetTruck: DedicatedFleetTruck) {
		const { id, syncStatus, ...payload } = dedicatedFleetTruck;
		try {
			let created;
			if (dedicatedFleetTruck.serverId) {
				created = await pocketbaseService.update(
					'dedicatedFleetTrucks',
					dedicatedFleetTruck.serverId,
					payload
				);
			} else {
				created = await pocketbaseService.create('dedicatedFleetTrucks', payload);
			}

			if (dedicatedFleetTruck.id) {
				await indexedDBService.updateRecord('dedicatedFleetTrucks', dedicatedFleetTruck.id, {
					...dedicatedFleetTruck,
					syncStatus: 'synced',
					serverId: created.id
				});
			}
			return true;
		} catch (err) {
			console.warn('Failed to sync dedicated fleet truck with PocketBase:', err);
			return false;
		}
	},

	async syncPendingDedicatedFleetTrucks() {
		const pending = await indexedDBService.getRecords(
			'dedicatedFleetTrucks',
			(rec: { syncStatus: string }) => rec.syncStatus === 'pending'
		);

		for (const dedicatedFleetTruck of pending) {
			await this.syncDedicatedFleetTrucks(dedicatedFleetTruck);
		}
	},

	async syncDedicatedFleetTrucksList() {
		try {
			// Fetch all dedicated fleet trucks from Pocketbase (no date filter)
			const allDedicatedFleetTrucks = await fetchAllFromPocketBase('dedicatedFleetTrucks', 1000);
			const allIndexedDedicatedFleetTrucks =
				await indexedDBService.getRecords('dedicatedFleetTrucks');

			for (const dedicatedFleetTruck of allDedicatedFleetTrucks) {
				// Match on either serverId or local id
				const existingDedicatedFleetTruck = allIndexedDedicatedFleetTrucks.find(
					(t) => t.serverId === dedicatedFleetTruck.id || t.id === dedicatedFleetTruck.id
				);

				if (existingDedicatedFleetTruck) {
					// Only update if not pending
					if (existingDedicatedFleetTruck.syncStatus !== 'pending') {
						await indexedDBService.updateRecord(
							'dedicatedFleetTrucks',
							existingDedicatedFleetTruck.id,
							{
								...existingDedicatedFleetTruck,
								loadingLocation: dedicatedFleetTruck.loadingLocation,
								syncStatus: 'synced',
								serverId: dedicatedFleetTruck.id,
								created: dedicatedFleetTruck.created,
								updated: dedicatedFleetTruck.updated
							}
						);
					}
				} else {
					// Create new record (already filtered by date on server)
					await indexedDBService.saveRecord('dedicatedFleetTrucks', {
						id: dedicatedFleetTruck.id,
						registration: dedicatedFleetTruck.registration,
						loadingLocation: dedicatedFleetTruck.loadingLocation,
						syncStatus: 'synced',
						serverId: dedicatedFleetTruck.id,
						created: dedicatedFleetTruck.created,
						updated: dedicatedFleetTruck.updated
					});
				}
			}
			return true;
		} catch (err: any) {
			if (!err?.message?.includes('autocancelled')) {
				console.error('❌ Failed to sync dedicated fleet truck list:', err);
			}
			return false;
		}
	},

	// ════════════════════════════════════════════════════════════════════════
	// BATCH SYNC & CLEANUP METHODS
	// ════════════════════════════════════════════════════════════════════════
	async syncAllPending() {
		await Promise.all([
			// Sync all pending records
			this.syncPendingAssays(),
			this.syncPendingConsignments(),
			this.syncPendingFleet(),
			this.syncPendingShuntingTrains(),
			this.syncPendingTrainArrivals(),
			this.syncPendingTrainDispatches(),
			this.syncPendingTruckArrivals(),
			this.syncPendingTruckLoads(),
			this.syncPendingTrucks(),
			this.syncPendingDedicatedFleetTrucks(),
			this.syncPendingWagons()
		]);
	},

	async fetchAll() {
		if (!runningList) {
			runningList = true;
			try {
				// Sync records from PocketBase in parallel for better performance
				await Promise.all([
					this.syncAssayList(),
					this.syncConsignmentList(),
					this.syncFleetList(),
					this.syncShuntingTrainList(),
					this.syncTrainArrivalList(),
					this.syncTrainDispatchList(),
					this.syncTrainList(),
					this.syncTruckArrivalList(),
					this.syncTruckLoadList(),
					this.syncTruckList(),
					this.syncWagonList(),
					this.syncDedicatedFleetTrucksList()
				]);

				// Update last sync completion time
				lastSyncCompletedTime = Date.now();
			} catch (err) {
				console.error('Error during syncAllPending:', err);
			} finally {
				runningList = false;
			}
		}
	},

	async deleteLocalDatabase() {
		// Prevent deletion checks if sync is currently running
		if (runningList) {
			console.log('⏸️ Skipping deletion check - sync is currently in progress');
			return;
		}

		// Ensure at least one sync has completed before attempting deletions
		const timeSinceLastSync = Date.now() - lastSyncCompletedTime;
		if (lastSyncCompletedTime === 0) {
			console.log('⏸️ Skipping deletion check - waiting for initial sync to complete');
			return;
		}

		// Wait at least 5 seconds after last sync completed to avoid race conditions
		if (timeSinceLastSync < 5000) {
			console.log(
				`⏸️ Skipping deletion check - last sync completed ${Math.round(timeSinceLastSync / 1000)}s ago`
			);
			return;
		}

		console.log('🧹 Starting deletion check for all collections...');

		// Delete records that no longer exist on the server
		const collections = [
			'assays',
			'consignments',
			'fleet',
			'shuntingTrains',
			'trainArrivals',
			'trainDispatches',
			'trains',
			'truckArrivals',
			'truckLoads',
			'trucks',
			'wagons',
			'dedicatedFleetTrucks'
		];

		for (const collection of collections) {
			try {
				await syncDeletedRecords(collection);
			} catch (error) {
				console.warn(`⚠️ Failed to sync deleted records for ${collection}:`, error);
			}
		}
	}
};
