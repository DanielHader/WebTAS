import { StochasticEventSet } from './stochastic_event.mjs';

const NORTH = 0;
const EAST  = 1;
const SOUTH = 2;
const WEST  = 3;

let temperature = 2;
let Gmc = 19.1, Gse = 10.0;
let kf = 1.2e7;

let eventSet = new StochasticEventSet(Gmc, Gse, kf);

let tileTypes = [];
let glues = [];

let locationMap = new Map(); // maps occupied locations to tile data
let seedLocations = new Set();
let adjacentLocations = new Set();

let signatureTable = new Map();
let signatureMap = new Map();
let frontierMap = new Map();

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

function calculateStrength(tid, x, y) {
	
	let strength = 0;
	const type = tileTypes[tid];
	
	for (let i = 0; i < 4; i++) {
		const nbrKey = locationKey(x + DX[i], y + DY[i]);

		const glue = type.glues[i];

		// if nbr exists, then add glue strength
		if (locationMap.has(nbrKey) and glue >= 0) {
			const nbr = locationMap.get(nbrKey);
			const nbrType = tileTypes[nbr.tid];
			const nbrGlue = nbrType.glues[(i + 2) % 4];
			
			if (glue === nbrGlue) {
				strength += glues[glue];
			}
		}
	}

	return strength;
}

function addTile(tid, x, y, isSeed=false) {
    const locKey = locationKey(x, y);

    if (locationMap.has(locKey)) {
    	console.log(`Attempting to add a tile ${tid} in an occupied location (${x}, ${y})`);
    	return false;
    }

    const strength = calculateStrength(tid, x, y);
    const tile = {tid: tid, x:x, y:y, strength:strength};

    // add location to location map
    locationMap.set(locKey, tile);

    // update neighboring tile strengths
    // for (let i = 0; i < 4; i++) {
    // 	const nbrKey = locationKey(x + DX[i], y + DY[i]);
    // 	if (locationMap.has(nbrKey)) {
    // 		const nbr = locationMap.get(nbrKey);
    // 		nbr.strength = calculateStrength(nbr.tid, nbr.x, nbr.y);
    // 	}
    // }

    // todo update event set

    // seed tiles will not detach
    if (isSeed) {

    }
}

function removeTile(tid, x, y) {

}

function stepForward() {

}