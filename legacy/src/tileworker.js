const NORTH = 0;
const EAST  = 1;
const SOUTH = 2;
const WEST  = 3;

let temperature = 2;
let simulation_mode = 'aTAM';

let tileTypes = [];
let glues = [];

let signatureTable = new Map();
let locationMap = new Map();
let seedMap = new Map();
let locationToIdMap = new Map();
let signatureMap = new Map();
let frontierMap = new Map();

let fastForwardFlag = false;
let fastBackwardFlag = false;

let b_report_nondeterminism = true;

let history = [];
let seedSize = 0;

// items to support the BlockTAM
let temperatureList = [];
let blockerDict = {};
let signatureTableDict = {};
let temperatureListIndex = 0;
let blocked_glue_labels_dict = {};
let blockers_v2_dict = {};


onmessage = function(e) {
    if (e.data.msg === "tileset") {
		tileTypes = e.data.types;
		glues = e.data.glues;

		for (const type of tileTypes) {
		    const g = [-1, -1, -1, -1];
		    if (type.glues.north !== null) g[0] = type.glues.north.id;
		    if (type.glues.east  !== null) g[1] = type.glues.east.id;
		    if (type.glues.south !== null) g[2] = type.glues.south.id;
		    if (type.glues.west  !== null) g[3] = type.glues.west.id;
		    type.glues = g;
		    if (type.id === undefined) {
		    	console.log('found tile type with undefined id', type);
		    }
		}

		blockers_v2_dict = e.data.blockers_v2;

		if (simulation_mode === 'BlockTAM') {
			const blocked_glue_ids = getBlockedGlueIds();
			precomputeSignatures(blocked_glue_ids);
		} else {
			precomputeSignatures();
		}
    } else if (e.data.msg === "step-forward") {
		const added_list = stepForward();
		if (added_list === null) {
		    postMessage({ msg: "frontier-empty" });
		} else {
			for (let i=0; i<added_list.length; i++) {
				postMessage({
					msg: "tile-added",
					tid: added_list[i][0],
					x: added_list[i][1],
					y: added_list[i][2]
				});
			}
		}
    } else if (e.data.msg === "step-backward") {
    	const removed = stepBackward();
    	if (removed !== null) {
    		postMessage({ msg: "tile-removed", tid: removed.tid, x: removed.x, y: removed.y });
    	} else {
    		postMessage({ msg: "back-to-seed"});
    	}
    } else if (e.data.msg === "add-tile") {
		addTile(e.data.tid, e.data.x, e.data.y);
    } else if (e.data.msg === "remove-tile") {
    	removeTile(e.data.x, e.data.y);
    } else if (e.data.msg === "fast-forward-start") {
		fastForwardFlag = true;
		fastForward();
    } else if (e.data.msg === "fast-forward-stop") {
		fastForwardFlag = false;
    } else if (e.data.msg === "fast-backward-start") {
		fastBackwardFlag = true;
		fastBackward();
    } else if (e.data.msg === "fast-backward-stop") {
		fastBackwardFlag = false;
    } else if (e.data.msg === 'clear') {
    	clear(e.data.temperature);
    } else if (e.data.msg === 'set-seed') {
    	for (const tile of e.data.seed) {
    		addTile(tile.type.id, tile.coords.x, tile.coords.y, b_add_to_frontier=true, b_seed_tile=true);
    	}
    	seedSize = e.data.seed.length;
    } else if (e.data.msg === 'set-temperature') {
    	temperature = e.data.temperature;
    } else if (e.data.msg === 'mode-aTAM') {
		simulation_mode = 'aTAM';
	} else if (e.data.msg === 'mode-SyncTAM') {
		simulation_mode = 'SyncTAM';
	} else if (e.data.msg === 'mode-BlockTAM') {
		simulation_mode = 'BlockTAM';
		temperatureList = e.data.temperatureList;
		temperatureListIndex = 0;
		blockerDict = e.data.blockerDict;
		clear(temperatureList[0]);
		const blocked_glue_ids = getBlockedGlueIds();
		precomputeSignatures(blocked_glue_ids);
		rebuildFrontier();
		self.postMessage({ msg: 'blocked-glues', blocked_glue_labels: blocked_glue_labels_dict[temperature]});

	} else if (e.data.msg === 'send-history') {
		self.postMessage({ msg: 'sent-history', history: history, b_show_names: e.data.b_show_names, b_show_labels: e.data.b_show_labels});
	} else if (e.data.msg === 'report-nondeterminism') {
		b_report_nondeterminism = e.data.b_report;
	}
};

function clear(temp) {
	signatureTable = new Map();
	locationMap = new Map();
	seedMap = new Map();
	locationToIdMap = new Map();
	signatureMap = new Map();
	frontierMap = new Map();

	glues = [];
	tileTypes = [];

	temperature = temp;

	fastForwardFlag = false;
}

const FAST_FORWARD_STEPS = 500;
const FAST_BACKWARD_STEPS = 500;

function fastForward() {
    let buff_size = FAST_FORWARD_STEPS;
	if ((simulation_mode === 'SyncTAM') && (buff_size < frontierMap.size)) {
		buff_size = frontierMap.size;
	}
	const fastForwardBuffer = new Int32Array(buff_size * 3);
	let num_added = 0;

	if ((simulation_mode === 'aTAM') || (simulation_mode === 'BlockTAM')) {
		for (let i = 0; i < FAST_FORWARD_STEPS; i++) {
			const added_list = stepForward();
			if (added_list === null) {
				postMessage({msg: "frontier-empty"});
				fastForwardFlag = false;
				break;
			}
			for (let j=0; j<added_list.length; j++) {
				fastForwardBuffer[3 * num_added + 0] = added_list[j][0];
				fastForwardBuffer[3 * num_added + 1] = added_list[j][1];
				fastForwardBuffer[3 * num_added + 2] = added_list[j][2];
				num_added += 1;
			}
		}
	} else if (simulation_mode === 'SyncTAM') {
		while ((num_added == 0) || ((num_added + frontierMap.size) < FAST_FORWARD_STEPS)) {

			const added_list = stepForward();
			if ((added_list === null) || (added_list.length === 0)) {
				postMessage({msg: "frontier-empty"});
				fastForwardFlag = false;
				break;
			}

			for (let j = 0; j < added_list.length; j++) {
				fastForwardBuffer[3 * num_added + 0] = added_list[j][0];
				fastForwardBuffer[3 * num_added + 1] = added_list[j][1];
				fastForwardBuffer[3 * num_added + 2] = added_list[j][2];
				num_added++;
			}
		}
	}

    postMessage({
		msg: "tiles-added",
		buffer: fastForwardBuffer,
		added: num_added,
    }, [fastForwardBuffer.buffer]);
    
    if (fastForwardFlag) {
		setTimeout(fastForward);
	}
}

function setBlockTAMtemperature() {
	// Set the temp and advance the temperature pointer
	let new_index = temperatureListIndex;

	if (temperatureList[temperatureList.length - 1] === '*') {
		if (temperatureListIndex === (temperatureList.length - 2)) {
			new_index = 0;
		} else {
			new_index = temperatureListIndex + 1;
		}
	} else if (temperatureListIndex === (temperatureList.length - 1)) {
		// All done!
		self.postMessage({ msg: 'changed-temperature', temperature: 'done'});
		return false;
	} else {
		new_index = temperatureListIndex + 1;
	}

	if (new_index !== temperatureListIndex) {
		// Replace the signature map
		signatureTableDict[temperature] = new Map(signatureTable);	// [TODO] This may need to be a deep copy
		temperatureListIndex = new_index;
		const last_temperature = temperature;
		temperature = temperatureList[temperatureListIndex];

		self.postMessage({ msg: 'changed-temperature', temperature: temperature});

		// If the temperature increased, check for tiles that would melt off at this temperature
		if (temperature > last_temperature) {
			checkTileBonds();
		}

		if (temperature in signatureTableDict) {
			signatureTable = new Map(signatureTableDict[temperature]);
		} else {
			const blocked_glue_ids = getBlockedGlueIds();
			precomputeSignatures(blocked_glue_ids);
		}

		rebuildFrontier();
		//self.postMessage({ msg: 'rebuilt-frontier', frontier_size: frontierMap.size });
		self.postMessage({ msg: 'blocked-glues', blocked_glue_labels: blocked_glue_labels_dict[temperature]});

		return true;
	}
	return false;
}

function getBlockedGlueIds() {
	if (temperature === undefined) {
		return [];
	}

	blocked_glue_labels_dict[temperature] = [];

	const blocked_glue_ids = [];
	if ((blockerDict !== undefined) && (Object.keys(blockerDict).length > 0)) {
		for (const blockerTemp in blockerDict) {
			if (temperature <= blockerTemp) {
				blocked_glue_labels_dict[temperature].push(...blockerDict[blockerTemp]);
			}
		}
		for (let i = 0; i < glues.length; i++) {
			if (blocked_glue_labels_dict[temperature].includes(glues[i].label)) {
				blocked_glue_ids.push(glues[i].id);
			}
		}
	} else if ((blockers_v2_dict !== undefined) && (Object.keys(blockers_v2_dict).length > 0)) {
		//const blocked_glues = [...type.glues];
		const blocker_temps = Object.keys(blockers_v2_dict).sort();
		blocker_temps.forEach((blocker_temp) => {
			if (temperature <= blocker_temp) {
				blockers_v2_dict[blocker_temp].forEach((blocked_tile) => {
					blocked_glue_labels_dict[temperature].push(blocked_tile);
				})
			}
		})
	}

	return blocked_glue_ids;
}

function fastBackward() {
	const fastBackwardBuffer = new Int32Array(FAST_BACKWARD_STEPS * 2);

	let i;
	for (i = 0; i < FAST_BACKWARD_STEPS; i++) {
		const removed = stepBackward();
		if (removed === null) {
			postMessage({ msg: 'back-to-seed' });
			fastBackwardFlag = false;
			break;
		}
		fastBackwardBuffer[2*i+0] = removed.x;
		fastBackwardBuffer[2*i+1] = removed.y;
	}

	postMessage({
		msg: "tiles-removed",
		buffer: fastBackwardBuffer,
		removed: i,
	}, [fastBackwardBuffer.buffer]);

	if (fastBackwardFlag)
		setTimeout(fastBackward);
}

function subsignatures(sig) {
    subsigs = [[-1, -1, -1, -1]];
    for (let i = 0; i < 4; i++) {
		if (sig[i] >= 0) {
		    const newsubsigs = [];
		    for (const subsig of subsigs) {
				const newsubsig = [...subsig];
				newsubsig[i] = sig[i];
				newsubsigs.push(newsubsig);
		    }
		    subsigs = subsigs.concat(newsubsigs);
		}
    }
    return subsigs;
}

function precomputeSignatures(blocked_glue_ids = []) {
	signatureTable = new Map();
    for (const type of tileTypes) {
		// Filter out blocked glues before passing to subsignatures
		const unblocked_glues = [...type.glues];
		const blocker_temps = Object.keys(blockers_v2_dict).sort();
		blocker_temps.forEach((blocker_temp) => {
			if (temperature <= blocker_temp) {
				blockers_v2_dict[blocker_temp].forEach((blocked_tile) => {
					if (type.name === blocked_tile['tileTypeName']) {
						if (blocked_tile['blockedSide'] === 'north') {
							unblocked_glues[0] = -1;
						} else if (blocked_tile['blockedSide'] === 'east') {
							unblocked_glues[1] = -1;
						} else if (blocked_tile['blockedSide'] === 'south') {
							unblocked_glues[2] = -1;
						} else if (blocked_tile['blockedSide'] === 'west') {
							unblocked_glues[3] = -1;
						}
					}
				})
			}
		})
		const subsigs = subsignatures(unblocked_glues);

		for (const subsig of subsigs) {
			let filtered_subsig = subsig;
			if (blocked_glue_ids.length > 0) {
				filtered_subsig = [];
				for (const s of subsig) {
					if (blocked_glue_ids.includes(s)) {
						filtered_subsig.push(-1);
					} else {
						filtered_subsig.push(s);
					}
				}
			}

		    let strength = 0;
		    for (let i = 0; i < 4; i++) {
				if (filtered_subsig[i] >= 0) {
					strength += glues[subsig[i]].strength;
				}
			}

		    if (strength >= temperature) {
				const sigstr = subsig.join();
				if (signatureTable.has(sigstr)) {
				    signatureTable.get(sigstr).push(type.id);
				} else {
				    signatureTable.set(sigstr, [type.id]);
				}
		    }
		}
    }
}

function rebuildFrontier() {
	frontierMap = new Map();
	for (let [key, value] of locationMap) {
		const coords = locationToIdMap.get(key);
		addNbrsToFrontier(value, coords.x, coords.y);
	}
}

function getFittingTileTypes(sig) {
    const sigstr = sig.join();

    // check if signature table has signature
    if (signatureTable.has(sigstr)) {
		return signatureTable.get(sigstr);
    } else { // if not, try subsignatures (i.e. ignore some adjacent glues and see if something fits)
		let fitting = [];
		const subsigs = subsignatures(sig);

		// for each subsignature, get fitting tiles and merge with existing to remove duplicates
		for (const subsig of subsigs) {
		    const subsigstr = subsig.join();
		    if (signatureTable.has(subsigstr)) {
				let subfitting = signatureTable.get(subsigstr);
				// TODO: optimize fitting to be a set rather than list
				fitting = [... new Set(fitting.concat(subfitting))];
		    }
		}

		signatureTable.set(sigstr, fitting);
		return fitting;
    }
}

function locationKey(x, y) {
    let a = x * 2;
    if (a < 0)
	a = -(a + 1);

    let b = y * 2;
    if (b < 0)
	b = -(b + 1);

    return Math.round((a + b) * (a + b + 1) / 2 + b);
}

const DX = [0, 1, 0, -1];
const DY = [1, 0, -1, 0];
const DIRS = ["north", "east", "south", "west"];

function addNbrsToFrontier(tid, x, y) {
	if (tid in tileTypes) {
		for (let i = 0; i < 4; i++) {
			const nbrkey = locationKey(x + DX[i], y + DY[i]);

			if (!locationMap.has(nbrkey)) {
				if (!signatureMap.has(nbrkey))
					signatureMap.set(nbrkey, [-1, -1, -1, -1]);

				let sig = signatureMap.get(nbrkey);
				sig[(i + 2) % 4] = tileTypes[tid].glues[i];

				const fitting = getFittingTileTypes(sig);
				if (fitting.length > 0) {
					frontierMap.set(nbrkey, [x + DX[i], y + DY[i]]);
				}
			}
		}
	}
}

function addTile(tid, x, y, b_add_to_frontier=true, b_seed_tile=false) {
    const key = locationKey(x, y);

    if (locationMap.has(key)) {
		console.log("ERROR: attempting to add a tile to an occupied location", tid, x, y);
		return false;
    }

    locationMap.set(key, tid);
	if (b_seed_tile) {
		seedMap.set(key, tid);
	}
	locationToIdMap.set(key, {x:x, y:y});
    signatureMap.delete(key);
    frontierMap.delete(key);

	if (b_add_to_frontier === true) {
		addNbrsToFrontier(tid, x, y);
	}

    return true;
}

function checkTileBonds() {
	melted_tiles = [];
	seed_melt = new Map();
	let b_did_melt = true
	while (b_did_melt) {
		b_did_melt = false;
		for (let [key, tid] of locationMap) {
			const coords = locationToIdMap.get(key);
			let strength = 0;
			for (let i = 0; i < 4; i++) {
				const glue1 = tileTypes[tid].glues[i];
				if (glue1 !== -1) {
					const nbr_key = locationKey(coords.x + DX[i], coords.y + DY[i]);
					if (locationMap.has(nbr_key)) {
						nbr_tid = locationMap.get(nbr_key);
						const glue2 = tileTypes[nbr_tid].glues[(i + 2) % 4];
						if (glue1 === glue2) {
							strength += glues[glue1].strength;
						}
					}
				}
			}
			if (strength < temperature) {
				if (seedMap.has(key)) {	// Do not melt seed tiles but note that they otherwise would melt off
					seed_melt.set(key, {msg: "seed-melt", tid: tid, x: coords.x, y: coords.y});
				} else {
					melted_tiles.push({tid: tid, x: coords.x, y: coords.y});
					removeTile(coords.x, coords.y);
					postMessage({msg: "tile-melted", tid: tid, x: coords.x, y: coords.y});
					b_did_melt = true;
					break;
				}
			}
		}
	}
	for (let [key, rec] of seed_melt) {
		postMessage({msg: "seed-melt", tid: rec.tid, x: rec.x, y: rec.y});
	}

}

function hasNeighbor(x, y) {
	for (let i = 0; i < 4; i++) {
		const nbrkey = locationKey(x + DX[i], y + DY[i]);
		if (locationMap.has(nbrkey))
			return true;
	}
	return false;
}

function removeTile(x, y) {

	// check if tile exists at location (x,y)
	const key = locationKey(x, y);
	if (locationMap.has(key)) { // if so

		// delete from location map
		locationMap.delete(key);
		locationToIdMap.delete(key);

		// initialize new signature to update signature map
		const newSignature = [-1,-1,-1,-1];

		// assume no neighbors by default
		let hasNbrs = false;

		// loop over all possible neighbor locations
		for (let i = 0; i < 4; i++) {

			// check neighbor for tile
			const nbrkey = locationKey(x + DX[i], y + DY[i]);
			if (locationMap.has(nbrkey)) { // if tile exists at neighbor location

				// get the tile id of the neighboring tile
				const nbrId = locationMap.get(nbrkey);
				
				// update new signature for x,y to include glue presented by neighbor
				newSignature[i] = tileTypes[nbrId].glues[(i + 2) % 4];

				// remember that a neighbor has been seen
				hasNbrs = true;
			} else { // no tile exists in neighbor location 
				if (signatureMap.has(nbrkey)) {

					// get neighbor signature if it exists
					let nbrSig = signatureMap.get(nbrkey);

					// update neighbor signature to remove current tile
					nbrSig[(i + 2) % 4] = -1;	

					// check if neighbors signature is now null-signature [-1,-1,-1,-1]
					if (nbrSig.every((x) => { x===-1 })) {
						// signature map only holds non-null signatures so remove neighbor
						signatureMap.delete(nbrkey);
					}

					// if no tiles fit in nbr location after removal, remove frontier location
					const fitting = getFittingTileTypes(nbrSig);
					if (fitting.length === 0) {
						frontierMap.delete(nbrkey);
					}
				}
			}
    	}

    	if (hasNbrs) {
    		signatureMap.set(key, newSignature);
    		const fitting = getFittingTileTypes(newSignature);
    		if (fitting.length > 0) {
    			frontierMap.set(key, [x, y]);
    		}
    	}
	}
}

function stepForward(recursion_level = 0) {

	const ret_list = Array();

	if ((simulation_mode === 'aTAM') || (simulation_mode === 'BlockTAM')) {
		let tid;
    	let loc;

		while (tid === undefined) {
			if (frontierMap.size === 0) {
				if (simulation_mode === 'BlockTAM') {
					postMessage({msg: "frontier-empty"});
					if (setBlockTAMtemperature() === true) {
						if (recursion_level < temperatureList.length) {
							recursion_level += 1;
							return stepForward(recursion_level);
						}
					}
				}
				return null; // no more tiles can be added
			}

			const frontierList = Array.from(frontierMap.keys());
			const key = frontierList[Math.floor(Math.random() * frontierList.length)];
			const sig = signatureMap.get(key);
			const fitting = getFittingTileTypes(sig);

			tid = fitting[Math.floor(Math.random() * fitting.length)];
			loc = frontierMap.get(key);

			if (tid === undefined) {
				postMessage({msg: 'tid-undefined'});
				frontierMap.delete(key);
			}
		}

		addTile(tid, loc[0], loc[1]);
		history.push({tid: tid, x: loc[0], y: loc[1]});
		ret_list.push([tid, loc[0], loc[1]]);

	} else {
		const frontierList = Array.from(frontierMap.keys());

		for (let i=0; i<frontierList.length; i++) {
			let tid;
			let loc;

			while (tid === undefined) {
				if (i === frontierList.length) {
					break; // no more tiles can be added
				}

				const key = frontierList[i];
				loc = frontierMap.get(key);

				const sig = signatureMap.get(key);
				const fitting = getFittingTileTypes(sig);
				if ((fitting.length > 1) && (b_report_nondeterminism === true)) {
					const type_list = Array();
					for (let t=0; t<fitting.length; t++) {
						type_list.push(tileTypes[fitting[t]].name);
					}
					postMessage({ msg: 'nondeterminism', loc: loc, types: type_list});
				}

				tid = fitting[Math.floor(Math.random() * fitting.length)];
				if (tid === undefined) {
					postMessage({ msg: 'tid-undefined'});
					i++;
				}
			}
			if (tid !== undefined) {
				addTile(tid, loc[0], loc[1], false);
				history.push({tid: tid, x: loc[0], y: loc[1]});
				ret_list.push([tid, loc[0], loc[1]]);
			}
		}

		for (let r = 0; r < ret_list.length; r++) {
			addNbrsToFrontier(ret_list[r][0], ret_list[r][1], ret_list[r][2]);
		}
	}

    // console.log('tile added', history, seedSize);

    return ret_list;
}

function stepBackward() {
	if (history.length <= 0) {
		return null; // can't step back anymore
	}

	const last = history.pop();
	removeTile(last.x, last.y);

	// console.log('tile removed', history, seedSize);

	return last;
}
