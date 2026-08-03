const NORTH = 0;
const EAST  = 1;
const SOUTH = 2;
const WEST  = 3;
const UP			= 4;
const DOWN			= 5;

let temperature = 2;
let simulation_mode = 'aTAM';

let tileTypes = [];
let glues = [];

let signatureTable = new Map();
let locationMap = new Map();
let signatureMap = new Map();
let frontierMap = new Map();

let fastForwardFlag = false;
let fastBackwardFlag = false;

let b_report_nondeterminism = true;

let history = [];
let seedSize = 0;


onmessage = function(e) {
    if (e.data.msg === "tileset") {
		tileTypes = e.data.types;
		glues = e.data.glues;

		for (const type of tileTypes) {
		    const g = [-1, -1, -1, -1, -1, -1];
		    if (type.glues.north !== null) g[0] = type.glues.north.id;
		    if (type.glues.east  !== null) g[1] = type.glues.east.id;
		    if (type.glues.south !== null) g[2] = type.glues.south.id;
		    if (type.glues.west  !== null) g[3] = type.glues.west.id;
			if (type.glues.up    !== null) g[4] = type.glues.up.id;
			if (type.glues.down  !== null) g[5] = type.glues.down.id;
		    type.glues = g;
		    if (type.id === undefined) {
		    	console.log('found tile type with undefined id', type);
		    }
		}
		
		precomputeSignatures();
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
					y: added_list[i][2],
					z: added_list[i][3]
				});
			}
		}
    } else if (e.data.msg === "step-backward") {
    	const removed = stepBackward();
    	if (removed !== null) {
    		postMessage({ msg: "tile-removed", tid: removed.tid, x: removed.x, y: removed.y, z: removed.z });
    	} else {
    		postMessage({ msg: "back-to-seed"});
    	}
    } else if (e.data.msg === "add-tile") {
		addTile(e.data.tid, e.data.x, e.data.y, e.data.z);
    } else if (e.data.msg === "remove-tile") {
    	removeTile(e.data.x, e.data.y, e.data.z);
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
    		addTile(tile.type.id, tile.coords.x, tile.coords.y, tile.coords.z);
    	}
    	seedSize = e.data.seed.length;
    } else if (e.data.msg === 'set-temperature') {
    	temperature = e.data.temperature;
    	console.log('set temp to ' + temperature);
    } else if (e.data.msg === 'mode-aTAM') {
		simulation_mode = 'aTAM';
	} else if (e.data.msg === 'mode-SyncTAM') {
		simulation_mode = 'SyncTAM';
	} else if (e.data.msg === 'send-history') {
		self.postMessage({ msg: 'sent-history', history: history, b_show_names: e.data.b_show_names, b_show_labels: e.data.b_show_labels});
	} else if (e.data.msg === 'report-nondeterminism') {
		b_report_nondeterminism = e.data.b_report;
	}
};

function clear(temp) {
	signatureTable = new Map();
	locationMap = new Map();
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
	const fastForwardBuffer = new Int32Array(buff_size * 4);
	let num_added = 0;

	if (simulation_mode === 'aTAM') {
		for (let i = 0; i < FAST_FORWARD_STEPS; i++) {
			const added_list = stepForward();
			if (added_list === null) {
				postMessage({msg: "frontier-empty"});
				fastForwardFlag = false;
				break;
			}
			for (let j=0; j<added_list.length; j++) {
				fastForwardBuffer[4 * num_added + 0] = added_list[j][0];
				fastForwardBuffer[4 * num_added + 1] = added_list[j][1];
				fastForwardBuffer[4 * num_added + 2] = added_list[j][2];
				fastForwardBuffer[4 * num_added + 3] = added_list[j][3];
				num_added += 1;
			}
		}
	} else {
		while ((num_added == 0) || ((num_added + frontierMap.size) < FAST_FORWARD_STEPS)) {

			const added_list = stepForward();
			if ((added_list === null) || (added_list.length === 0)) {
				postMessage({msg: "frontier-empty"});
				fastForwardFlag = false;
				break;
			}

			for (let j = 0; j < added_list.length; j++) {
				fastForwardBuffer[4 * num_added + 0] = added_list[j][0];
				fastForwardBuffer[4 * num_added + 1] = added_list[j][1];
				fastForwardBuffer[4 * num_added + 2] = added_list[j][2];
				fastForwardBuffer[4 * num_added + 3] = added_list[j][3];
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
	} else {
		//console.log('stopping fast forward');
	}
}

function fastBackward() {
	const fastBackwardBuffer = new Int32Array(FAST_BACKWARD_STEPS * 3);

	let i;
	for (i = 0; i < FAST_BACKWARD_STEPS; i++) {
		const removed = stepBackward();
		if (removed === null) {
			postMessage({ msg: 'back-to-seed' });
			fastBackwardFlag = false;
			break;
		}
		fastBackwardBuffer[3*i+0] = removed.x;
		fastBackwardBuffer[3*i+1] = removed.y;
		fastBackwardBuffer[3*i+2] = removed.z;
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
    subsigs = [[-1, -1, -1, -1, -1, -1]];
    for (let i = 0; i < 6; i++) {
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

function precomputeSignatures() {
    for (const type of tileTypes) {
		const subsigs = subsignatures(type.glues);

		for (const subsig of subsigs) {
		    let strength = 0;
		    for (let i = 0; i < 6; i++) {
				if (subsig[i] >= 0)
				    strength += glues[subsig[i]].strength;
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

function locationKey(x, y, z) {
	return '' + x + '_' + y + '_' + z;

    // let a = x * 2;
    // if (a < 0)
	// a = -(a + 1);
	//
    // let b = y * 2;
    // if (b < 0)
	// b = -(b + 1);
	//
    // return Math.round((a + b) * (a + b + 1) / 2 + b);
}

const DX = [0, 1, 0, -1, 0, 0];
const DY = [1, 0, -1, 0, 0, 0];
const DZ = [0, 0, 0, 0, 1, -1];
const DIRS = ["north", "east", "south", "west", "up", "down"];
const OPP_DIRS = [2,3,0,1,5,4];

function addNbrsToFrontier(tid, x, y, z) {
	for (let i = 0; i < 6; i++) {
		const nbrkey = locationKey(x + DX[i], y + DY[i], z + DZ[i]);

		if (!locationMap.has(nbrkey)) {
		    if (!signatureMap.has(nbrkey))
				signatureMap.set(nbrkey, [-1,-1,-1,-1,-1,-1]);

		    let sig = signatureMap.get(nbrkey);
		    sig[OPP_DIRS[i]] = tileTypes[tid].glues[i];

		    const fitting = getFittingTileTypes(sig);
		    if (fitting.length > 0)
				frontierMap.set(nbrkey, [x + DX[i], y + DY[i], z + DZ[i]]);
		}
    }
}

function addTile(tid, x, y, z, b_add_to_frontier=true) {
    const key = locationKey(x, y, z);

    if (locationMap.has(key)) {
		console.log("ERROR: attempting to add a tile to an occupied location", tid, x, y, z);
		return false;
    }

    locationMap.set(key, tid);
    signatureMap.delete(key);
    frontierMap.delete(key);

	if (b_add_to_frontier === true) {
		addNbrsToFrontier(tid, x, y, z);
	}

    return true;
}

function hasNeighbor(x, y, z) {
	for (let i = 0; i < 6; i++) {
		const nbrkey = locationKey(x + DX[i], y + DY[i], z + DZ[i]);
		if (locationMap.has(nbrkey))
			return true;
	}
	return false;
}

function removeTile(x, y, z) {

	// check if tile exists at location (x,y,z)
	const key = locationKey(x, y, z);
	if (locationMap.has(key)) { // if so

		// delete from location map
		locationMap.delete(key);

		// initialize new signature to update signature map
		const newSignature = [-1,-1,-1,-1,-1,-1];

		// assume no neighbors by default
		let hasNbrs = false;

		// loop over all possible neighbor locations
		for (let i = 0; i < 6; i++) {

			// check neighbor for tile
			const nbrkey = locationKey(x + DX[i], y + DY[i], z + DZ[i]);
			if (locationMap.has(nbrkey)) { // if tile exists at neighbor location

				// get the tile id of the neighboring tile
				const nbrId = locationMap.get(nbrkey);
				
				// update new signature for x,y to include glue presented by neighbor
				newSignature[i] = tileTypes[nbrId].glues[OPP_DIRS[i]];

				// remember that a neighbor has been seen
				hasNbrs = true;
			} else { // no tile exists in neighbor location 
				if (signatureMap.has(nbrkey)) {

					// get neighbor signature if it exists
					let nbrSig = signatureMap.get(nbrkey);

					// update neighbor signature to remove current tile
					nbrSig[OPP_DIRS[i]] = -1;

					// check if neighbors signature is now null-signature [-1,-1,-1,-1,-1,-1]
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
    			frontierMap.set(key, [x, y, z]);
    		}
    	}
	}
}

function stepForward() {

	const ret_list = Array();

	if (simulation_mode === 'aTAM') {
		let tid;
    	let loc;

		while (tid === undefined) {
			if (frontierMap.size === 0) {
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

		addTile(tid, loc[0], loc[1], loc[2]);
		history.push({tid: tid, x: loc[0], y: loc[1], z: loc[2]});
		ret_list.push([tid, loc[0], loc[1], loc[2]]);

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
				addTile(tid, loc[0], loc[1], loc[2], false);
				history.push({tid: tid, x: loc[0], y: loc[1], z: loc[2]});
				ret_list.push([tid, loc[0], loc[1], loc[2]]);
			}
		}

		for (let r = 0; r < ret_list.length; r++) {
			addNbrsToFrontier(ret_list[r][0], ret_list[r][1], ret_list[r][2], ret_list[r][3]);
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
	removeTile(last.x, last.y, last.z);

	// console.log('tile removed', history, seedSize);

	return last;
}
