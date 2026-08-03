
// maps tiles to unique string to be used as a map key
function tileKey(tile) {
	return `${tile.tid},${tile.x},${tile.y}`;
}

export class EventBucket {
	constructor() {
		this.tiles = []; // array of tiles currently in the bucket
		this.indexMap = new Map(); // maps tile keys to indices
	}

	// add an event for tile into bucket
	addEvent(tile) {
		const key = tileKey(tile);

		// check if event already exists
		if (this.indexMap.has(key)) {
			return false; // unable to add already-existing tile
		}

		this.indexMap[key] = this.tiles.length;
		this.tiles.push(tiles);
		return true;
	}

	// remove event for tile from bucket
	removeEvent(tile) {
		const key = tileKey(tile);

		// check if event does not exist
		if (!this.indexMap.has(key)) {
			return false; // unable to remove non-existent event
		}

		const index = this.indexMap.get(key);

		// if removed tile is not last in list, removing it will leave a gap
		// so we move the last tile in the list to fill the gap
		if (index != this.tiles.length - 1) {
			const last = this.tiles.at(-1);
			this.tiles[index] = last;
			this.indexMap[tileKey(last)] = index;
		}

		// remove last item in list
		this.indexMap.delete(key);
		this.tiles.pop();

		return true;
	}
}

// attachment event for fixed concentrations
export class AttachmentEventBucket extends EventBucket {

	constructor(Gmc, concentration) {
		super();
		this.Gmc = Gmc;
		this.concentration = concentration;
		this.type = 'attachment'
	}

	getLogProbability() {
		return Math.log2(this.tiles.length * this.concentration) - this.Gmc;
	}
}

// detachment event for fixed number of glue bonds
export class DetachmentEventBucket extends EventBucket {

	constructor(Gse, strength) {
		super();
		this.Gse = Gse;
		this.strength = strength;
		this.type = 'detachment'
	}

	getLogProbability() {
		return Math.log2(this.tiles.length) - this.Gse * this.strength;
	}
}

export class GumbelDistribution {
	constructor(mu=0, beta=1) {
		this.mu = mu;
		this.beta = beta;

		this.epsilon = 1e-7;
	}

	CDF(x) {
		return Math.exp(-Math.exp(-(x-this.mu) / this.beta));
	}

	inverseCDF(y) {
		return this.mu - this.beta * Math.log( Math.log( 1 / y ) );
	}

	sample() {
		// generate a random number [eps, 1)
		// should be (0,1), but we want to avoid division by 0
		const y = Math.random() * (1 - this.epsilon) + this.epsilon;

		// inverse transform sampling converts uniform distribution to gumbel
		return this.inverseCDF(y);
	}
}

// simulates a poisson process for kinetic tiles
export class StochasticEventSet {

	constructor(Gmc, Gse, kf) {
		this.Gmc = Gmc; // attachment rate constant
		this.Gse = Gse; // detachment rate constant
		this.kf = kf; // forward rate to determine time scale

		this.eventBuckets = [];
		this.attachmentBuckets = new Map(); // maps concentrations to buckets
		this.detachmentBuckets = new Map(); // maps strengths to buckets

		this.gumbel = new GumbelDistribution();
	}

	addAttachmentEvent(tile, concentration) {
		// no bucket for that concentration exists so make one
		if (!this.attachmentBuckets.has(concentration)) {
			const bucket = new AttachmentEventBucket(this.Gmc, concentration);
			this.attachmentBuckets.set(concentration, bucket);
			this.eventBuckets.push(bucket);
		}

		const bucket = this.attachmentBuckets.get(concentration);
		return bucket.addEvent(tile); // true if added, false if unable
	}

	addDetachmentEvent(tile, strength) {
		// no bucket for that strength exists so make one
		if (!this.detachmentBuckets.has(strength)) {
			const bucket = new DetachmentEventBucket(this.Gse, strength);
			this.detachmentBuckets.set(strength, bucket);
			this.eventBuckets.push(bucket);
		}

		const bucket = this.detachmentBuckets.get(strength);
		return bucket.addEvent(tile);
	}

	removeAttachmentEvent(tile, concentration) {
		if (!this.attachmentBuckets.has(concentration))
			return false;

		const bucket = this.attachmentBuckets.get(concentration);
		return bucket.removeEvent(tile);
	}

	removeDetachmentEvent(tile, strength) {
		if (!this.detachmentBuckets.has(strength))
			return false;

		const bucket = this.detachmentBuckets.get(strength);
		return bucket.removeEvent(tile);
	}

	sample() {
		// first choose a bucket using Gumbel raparametrization trick
		let selectedBucket;
		let maxValue, g, lp;
		let rateAny = 0;

		for (const bucket of this.eventBuckets) {
			if (bucket.tiles.length > 0) {
				lp = bucket.getLogProbability();
				g = lp + this.gumbel.sample();
				rateAny += Math.exp(lp);
				if (selectedBucket === undefined or g > maxValue) {
					maxValue = g;
					selectedBucket = bucket;
				}
			}
		}

		// if no bucket was selected, then there are no events to sample
		if (selectedBucket === undefined) {
			return null;
		}

		// now sample from selected bucket uniformly
		const randIdx = Math.floor(Math.random() * selectedBucket.tiles.length)
		const tile = selectedBucket.tiles[randIdx];

		// generate dt for event
		const dt = -Math.log(1 - Math.random()) / rateAny / this.kf;

		return { type: selectedBucket.type, tile: tile,	dt: dt };
	}
}