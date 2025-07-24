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

function base64ToBlob(base64: string, mime: string) {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
}

async function fetchAllFromPocketBase(collection: PBCollection, perPage = 50) {
	let page = 1;
	let items: any[] = [];
	let allItems: any[] = [];
	let response;
	do {
		response = await pocketbaseService.list(collection, { page, perPage });
		items = response.items;
		allItems = allItems.concat(items);
		page++;
	} while (items.length === perPage);
	return allItems;
}

export const syncService = {
	// Assay sync methods
	async syncAssay(assay: Assay) {
		try {
			const { id, syncStatus, ...payload } = assay;

			if (assay.serverId) {
				// Check all linked wagons have server IDs before updating
				if (assay.linkedWagonIds?.length) {
					const wagons = await Promise.all(
						assay.linkedWagonIds.map((id) => indexedDBService.getRecord('wagons', id))
					);

					// Check if all wagons have server IDs
					const allWagonsHaveServerId = wagons.every((wagon) => wagon?.serverId);
					if (!allWagonsHaveServerId) {
						console.warn('Waiting for all wagons to sync before updating assay');
						return false;
					}

					// Replace local IDs with server IDs
					payload.linkedWagonIds = wagons
						.map((wagon) => wagon?.serverId)
						.filter((id): id is string => id !== undefined);
				}

				if (assay.linkedFleetId) {
					const fleet = await indexedDBService.getRecord('fleet', assay.linkedFleetId);
					if (fleet?.serverId) {
						payload.linkedFleetId = fleet.serverId;
					}
				}

				// Check all linked truck loads have server IDs before updating
				if (assay.linkedTruckLoadIds?.length) {
					const truckLoads = await Promise.all(
						assay.linkedTruckLoadIds.map((id) => indexedDBService.getRecord('truckLoads', id))
					);

					// Check if all truck loads have server IDs
					const allTruckLoadsHaveServerId = truckLoads.every((load) => load?.serverId);
					if (!allTruckLoadsHaveServerId) {
						console.warn('Waiting for all truck loads to sync before updating assay');
						return false;
					}

					// Replace local IDs with server IDs
					payload.linkedTruckLoadIds = truckLoads
						.map((load) => load?.serverId)
						.filter((id): id is string => id !== undefined);
				}

				// Update existing record in PocketBase
				const created = await pocketbaseService.update('assays', assay.serverId, payload);

				if (assay.id) {
					await indexedDBService.updateRecord('assays', assay.id, {
						...assay,
						syncStatus: 'synced',
						serverId: created.id,
						siteLocation: assay.siteLocation
					});
				}
			} else {
				// For new records, check linked items before creating
				if (assay.linkedWagonIds?.length) {
					const wagons = await Promise.all(
						assay.linkedWagonIds.map((id) => indexedDBService.getRecord('wagons', id))
					);

					// Check if all wagons have server IDs
					const allWagonsHaveServerId = wagons.every((wagon) => wagon?.serverId);
					if (!allWagonsHaveServerId) {
						console.warn('Waiting for all wagons to sync before updating assay');
						return false;
					}

					// Replace local IDs with server IDs
					payload.linkedWagonIds = wagons
						.map((wagon) => wagon?.serverId)
						.filter((id): id is string => id !== undefined);
				}

				if (assay.linkedTruckLoadIds?.length) {
					const truckLoads = await Promise.all(
						assay.linkedTruckLoadIds.map((id) => indexedDBService.getRecord('truckLoads', id))
					);

					const allTruckLoadsHaveServerId = truckLoads.every((load) => load?.serverId);
					if (!allTruckLoadsHaveServerId) {
						console.warn('Waiting for all truck loads to sync before creating assay');
						return false;
					}

					payload.linkedTruckLoadIds = truckLoads
						.map((load) => load?.serverId)
						.filter((id): id is string => id !== undefined);
				}

				const created = await pocketbaseService.create('assays', payload);
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

	// Add other sync methods as needed
	async syncPendingAssays() {
		const pending = await indexedDBService.getRecords(
			'assays',
			(rec: { syncStatus: string }) => rec.syncStatus === 'pending'
		);

		for (const assay of pending) {
			await this.syncAssay(assay);
		}
	},

	// Wagon sync methods
	async syncWagon(wagon: Wagon) {
		try {
			const { id, syncStatus, ...payload } = wagon;
			let created;
			if (wagon.serverId) {
				// Update existing record in PocketBase
				created = await pocketbaseService.update('wagons', wagon.serverId, payload);
			} else {
				// Create new record in PocketBase
				created = await pocketbaseService.create('wagons', payload);
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

	async syncTruckList() {
		try {
			const allTrucks = await fetchAllFromPocketBase('trucks');
			const allIndexedTrucks = await indexedDBService.getRecords('trucks');
			for (const truck of allTrucks) {
				if (allIndexedTrucks.some((t) => t.serverId || t.id === truck.id)) {
					await indexedDBService.updateRecord('trucks', truck.id, {
						...truck,
						id: truck.id,
						registration: truck.registration,
						syncStatus: 'synced',
						serverId: truck.id,
						loadingLocation: truck.loadingLocation,
						loadingHour: truck.loadingHour,
						felWeight: truck.felWeight
					});
				} else {
					await indexedDBService.saveRecord('trucks', {
						id: truck.id,
						registration: truck.registration,
						syncStatus: 'synced',
						serverId: truck.id,
						loadingLocation: truck.loadingLocation,
						loadingHour: truck.loadingHour,
						felWeight: truck.felWeight
					});
				}
			}
			return true;
		} catch (err) {
			console.warn('Failed to sync truck list:', err);
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

	async syncTrainList() {
		try {
			const allTrains = await fetchAllFromPocketBase('trains');
			for (const train of allTrains) {
				await indexedDBService.saveRecord('trains', {
					id: train.id,
					refNr: train.refNr,
					serverId: train.id,
					rfidNr: train.rfidNr,
					syncStatus: 'synced'
				});
			}
			return true;
		} catch (err) {
			console.warn('Failed to sync train list:', err);
			return false;
		}
	},

	async syncConsignmentList() {
		try {
			const allConsignments = await fetchAllFromPocketBase('consignments');
			for (const consignment of allConsignments) {
				await indexedDBService.saveRecord('consignments', {
					id: consignment.id,
					name: consignment.name,
					linkedTrainId: consignment.linkedTrainId,
					syncStatus: 'synced',
					serverId: consignment.id,
					siteLocation: consignment.siteLocation
				});
			}
			return true;
		} catch (err) {
			console.warn('Failed to sync consignment list:', err);
			return false;
		}
	},

	async syncConsignment(consignment: any) {
		try {
			const { id, syncStatus, ...payload } = consignment;

			let created;
			if (consignment.serverId) {
				created = await pocketbaseService.update('consignments', consignment.serverId, payload);
			} else {
				created = await pocketbaseService.create('consignments', payload);
			}

			if (consignment.id) {
				await indexedDBService.updateRecord('consignments', consignment.id, {
					...consignment,
					syncStatus: 'synced',
					serverId: created.id,
					siteLocation: consignment.siteLocation
				});
			}
			return true;
		} catch (err) {
			console.warn('Failed to sync consignment with PocketBase:', err);
			return false;
		}
	},

	async syncPendingConsignment() {
		const pending = await indexedDBService.getRecords(
			'consignments',
			(rec: { syncStatus: string }) => rec.syncStatus === 'pending'
		);

		for (const consignment of pending) {
			await this.syncConsignment(consignment);
		}
	},

	async syncTruckLoad(truckLoad: TruckLoad) {
		try {
			const { id, syncStatus, ...payload } = truckLoad;

			let created;
			if (truckLoad.serverId) {
				created = await pocketbaseService.update('truckLoads', truckLoad.serverId, payload);
			} else {
				created = await pocketbaseService.create('truckLoads', payload);
			}

			if (truckLoad.id) {
				await indexedDBService.updateRecord('truckLoads', truckLoad.id, {
					...truckLoad,
					syncStatus: 'synced',
					serverId: created.id,
					siteLocation: truckLoad.siteLocation
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

					// Check if all wagons have server IDs
					const allWagonsHaveServerId = wagons.every((wagon) => wagon?.serverId);
					if (!allWagonsHaveServerId) {
						console.warn('Waiting for all wagons to sync before updating train dispatch');
						return false;
					}

					// Replace local IDs with server IDs
					payload.linkedWagonIds = wagons
						.map((wagon) => wagon?.serverId)
						.filter((id): id is string => id !== undefined);
				}
				if (payload.linkedConsignmentId) {
					const consignment = await indexedDBService.getRecord('consignments', payload.linkedConsignmentId);
					if (consignment?.serverId) {
						payload.linkedConsignmentId = consignment.serverId; 
					}
				}
				created = await pocketbaseService.update(
					'trainDispatches',
					trainDispatch.serverId,
					payload
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
					const consignment = await indexedDBService.getRecord('consignments', payload.linkedConsignmentId);
					if (consignment?.serverId) {
						payload.linkedConsignmentId = consignment.serverId; 
					}
				}
				created = await pocketbaseService.create('trainDispatches', payload);
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
	/**
	  * Remove any local records whose serverId
	  * no longer exists in PocketBase.
	  */
	async syncDeletedRecords(collectionName: any) {
		try {
			const serverIds = new Set<string>()
			const perPage = 50
			let page = 1
			let items: { id: string }[] = []

			// page through PocketBase
			do {
				const res = await pocketbaseService.list(collectionName, { page, perPage })
				items = res.items
				for (const it of items) serverIds.add(it.id)
				page++
			} while (items.length === perPage)

			// pull all local records that have a serverId
			const local = await indexedDBService.getRecords(
				collectionName,
				(rec: { serverId?: string }) => !!rec.serverId
			)

			// delete any local whose serverId isn't on the server
			for (const rec of local) {
				if (!serverIds.has(rec.serverId!)) {
					await indexedDBService.deleteRecord(collectionName, rec.id)
				}
			}

			return true
		} catch (err) {
			console.warn(
				`Failed to reconcile deletions for ${collectionName}:`,
				err
			)
			return false
		}
	}, 

	// ShuntingTrain sync methods
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
				const updated = await pocketbaseService.update('shuntingTrains', shuntingTrain.id, payload);

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

	// Add helper method for batch syncing
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
			const response = await pocketbaseService.list('shuntingTrains');
            for (const train of response.items) {
                await indexedDBService.saveRecord('shuntingTrains', {
                    id: train.id,
                    postDate: train.postDate,
                    syncStatus: 'synced',
                    created: train.created,
                    updated: train.updated,
                    linkedWagons: train.linkedWagons,
                    verificationTimestamp: train.verificationTimestamp
                });
            }
            return true;
		} catch (err) {
			console.warn('Failed to sync shunting train list:', err);
			return false;
		}
	},

	async syncWagonList() {
		try {
			const allWagons = await fetchAllFromPocketBase('wagons');
			const allIndexedWagons = await indexedDBService.getRecords('wagons');
			for (const wagon of allWagons) {
				if (allIndexedWagons.some((w) => w.serverId || w.id === wagon.wagonId)) {
					await indexedDBService.updateRecord('wagons', wagon.id, {
						id: wagon.id,
						wagonId: wagon.wagonId,
						wagonIdSimple: wagon.wagonIdSimple,
						transcoreTag: wagon.transcoreTag,
						componentType: wagon.componentType,
						wagonPhotoUrl: wagon.wagonPhotoUrl,
						dispatchTimestamp: wagon.dispatchTimestamp,
						releaseTimestamp: wagon.releaseTimestamp,
						trainNumber: wagon.trainNumber,
						loadingLocation: wagon.loadingLocation,
						felWeight: wagon.felWeight,
						serverId: wagon.id,
						syncStatus: 'synced',
						created: wagon.created,
						updated: wagon.updated
					});
				} else {
					await indexedDBService.saveRecord('wagons', {
						id: wagon.id,
						wagonId: wagon.wagonId,
						wagonIdSimple: wagon.wagonIdSimple,
						transcoreTag: wagon.transcoreTag,
						componentType: wagon.componentType,
						wagonPhotoUrl: wagon.wagonPhotoUrl,
						dispatchTimestamp: wagon.dispatchTimestamp,
						releaseTimestamp: wagon.releaseTimestamp,
						trainNumber: wagon.trainNumber,
						loadingLocation: wagon.loadingLocation,
						felWeight: wagon.felWeight,
						serverId: wagon.id,
						syncStatus: 'synced',
						created: wagon.created,
						updated: wagon.updated
					});
				}
			}
			return true;
		} catch (err) {
			console.error('❌ Failed to sync wagon list:', err);
			console.warn('Failed to sync wagon list:', err);
			return false;
		}
	},

	async syncTruckArrival(truckArrival: TruckArrival) {
		try {
			const { id, syncStatus, ...payload } = truckArrival;

			let created;

			// Prepare a payload for PocketBase with Blob if needed
			let apiPayload: any = { ...payload };
			// Convert base64 to Blob for PocketBase file upload
			if (payload.truck_photo && typeof payload.truck_photo === 'string' && payload.truck_photo.startsWith('data:')) {
				const [meta] = payload.truck_photo.split(',');
				const mime = meta.match(/data:(.*);base64/)?.[1] || 'image/webp';
				apiPayload.truck_photo = base64ToBlob(payload.truck_photo, mime);
			}

			if(truckArrival.serverId) {
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
				created = await pocketbaseService.update('truckArrivals', truckArrival.serverId, apiPayload);	
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
				created = await pocketbaseService.create('truckArrivals', apiPayload);
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

	// Add helper method for batch syncing
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
			const response = await pocketbaseService.list('truckArrivals');
			for (const arrival of response.items) {
				await indexedDBService.saveRecord('truckArrivals', {
					id: arrival.id,
					truckId: arrival.truckId,
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
					created: arrival.created,
					updated: arrival.updated,
					serverId: arrival.id
				});
			}
			return true;
		} catch (err) {
			console.warn('Failed to sync truck arrival list:', err);
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
			if (payload.trainPhotoUrl && typeof payload.trainPhotoUrl === 'string' && payload.trainPhotoUrl.startsWith('data:')) {
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
				created = await pocketbaseService.update('trainArrivals', trainArrival.serverId, apiPayload);
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
				created = await pocketbaseService.create('trainArrivals', apiPayload);
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

	// Add helper method for batch syncing
	async syncPendingTrainArrivals() {
		const pending = await indexedDBService.getRecords(
			'trainArrivals',
			(rec: { syncStatus: string }) => rec.syncStatus === 'pending'
		);

		for (const trainArrival of pending) {
			await this.syncTrainArrival(trainArrival);
		}
	},

	async syncFleet(fleet : Fleet) {
		try {
			const { id, syncStatus, ...payload } = fleet;

			let created;
			if (fleet.serverId) {
				created = await pocketbaseService.update('fleet', fleet.serverId, payload);
			} else {
				created = await pocketbaseService.create('fleet', payload);
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
	
	// Update syncAllPending to include train dispatches
	async syncAllPending() {
		await Promise.all([
			// Sync all pending records
			this.syncPendingAssays(),
			this.syncPendingWagons(),
			this.syncPendingTrucks(),
			this.syncPendingTruckLoads(),
			this.syncPendingConsignment(),
			this.syncPendingTrainDispatches(),
			this.syncPendingTrainArrivals(),
			this.syncPendingShuntingTrains(),
			this.syncPendingTruckArrivals(),
			this.syncPendingFleet(),
		]);

		// Sync records from PocketBase
		await this.syncConsignmentList();
		await this.syncTruckList();
		await this.syncWagonList();
		await this.syncShuntingTrainList();
		await this.syncTrainList();
		await this.syncTruckArrivalList();

		// Delete records that no longer exist on the server
		await this.syncDeletedRecords('assays');
		await this.syncDeletedRecords('wagons');
		await this.syncDeletedRecords('truckLoads');
		await this.syncDeletedRecords('trainDispatches');
	}
};



