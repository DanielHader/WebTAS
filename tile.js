
const tile_geometry = new THREE.PlaneGeometry();
const tile_material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

class Glue {
    constructor(strength, label) {
	this.strength = strength;
	this.label = label;
    }
}

class TileType {
    constructor(name, label, color, glues) {
	this.glues = glues;

	const bitmap = document.createElement('canvas');
	const ctx = bitmap.getContext('2d');

	const TEX_SIZE = 256;
	const LINE_DASH = [5 * TEX_SIZE / 100, 3 * TEX_SIZE / 100];
	const NAME_SIZE = TEX_SIZE / 10
	const LABEL_SIZE = TEX_SIZE / 5;
	const GLUE_SIZE = TEX_SIZE / 10;
	const GLUE_OFFSET = TEX_SIZE / 5;
	
	bitmap.width = TEX_SIZE;
	bitmap.height = TEX_SIZE;

	ctx.fillStyle = color;
	ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

	ctx.fillStyle = 'black';
	ctx.textAlign = 'center';

	ctx.font = `${LABEL_SIZE}px Arial`;
	ctx.fillText(label, TEX_SIZE / 2, 4 * TEX_SIZE / 7);

	ctx.font = `${NAME_SIZE}px Arial`;
	ctx.fillText(name, TEX_SIZE / 2, 5 * TEX_SIZE / 7);

	ctx.strokeStyle = 'black';
	ctx.font = `${GLUE_SIZE}px Arial`;
	ctx.lineWidth = TEX_SIZE / 50;

	// north glue
	['north', 'east', 'south', 'west'].forEach((side, index) => {
	    ctx.save();
	    ctx.rotate(index * Math.PI / 2);
	    if (index === 1 || index === 2) ctx.translate(0, -TEX_SIZE);
	    if (index === 2 || index === 3) ctx.translate(-TEX_SIZE, 0);

	    if (this.glues[side]) {
		ctx.fillText(this.glues[side].label, TEX_SIZE / 2, GLUE_OFFSET);
		
		if (this.glues[side].strength == 0) ctx.setLineDash(LINE_DASH);
		else ctx.setLineDash([]);

		ctx.beginPath();
		ctx.moveTo(0, ctx.lineWidth / 2);
		ctx.lineTo(TEX_SIZE, ctx.lineWidth / 2);
		ctx.stroke();
		if (this.glues[side].strength > 1) {
		    ctx.beginPath();
		    ctx.moveTo(0, 5 * ctx.lineWidth / 2);
		    ctx.lineTo(TEX_SIZE, 5 * ctx.lineWidth / 2);
		    ctx.stroke();
		}
		
	    } else {
		ctx.setLineDash(LINE_DASH);

		ctx.beginPath();
		ctx.moveTo(0, ctx.lineWidth / 2);
		ctx.lineTo(TEX_SIZE, ctx.lineWidth / 2);
		ctx.stroke();
	    }

	    ctx.restore();
	});

	this.texture = new THREE.Texture(bitmap);
	this.texture.needsUpdate = true;
	this.material = new THREE.MeshBasicMaterial({ map: this.texture });
    }
}

class Tile {
    constructor(type, x, y) {
	this.type = type;
	this.x = x;
	this.y = y;

	this.mesh = new THREE.Mesh(tile_geometry, type.material);
	this.mesh.position.set(this.x, this.y);
	scene.add(this.mesh);
    }
}

class System {
    constructor(temperature, tile_types) {
	this.temperature = temperature;
	this.tile_types = tile_types;

	this.tiles = [];
	this.grid = new Map();
	this.frontier = new Map();
	this.fitting_tiles = new Map();
	this.history = [];
	this.seed = [];
	
	this.coord_index_func = (x, y) => {
	    const a = x <= 0 ? -2*x : 2*x-1;
	    const b = y <= 0 ? -2*y : 2*y-1;
	    return (((a + b + 1) * (a + b)) >> 1) + b;
	}

	this.fitting_index_func = (n, e, s, w) => {
	    if (n === undefined) n = this.tile_types.length;
	    if (e === undefined) e = this.tile_types.length;
	    if (s === undefined) s = this.tile_types.length;
	    if (w === undefined) w = this.tile_types.length;
	    const a = (((n + e + 1) * (n + e)) >> 1) + e;
	    const b = (((s + w + 1) * (s + w)) >> 1) + w;
	    return (((a + b + 1) * (a + b)) >> 1) + b;
	}

	this.addTile(0, 0, 0, true);
    }

    addTile(type_index, x, y, seed=false) {
	const coord = this.coord_index_func(x, y);
	const tile = new Tile(this.tile_types[type_index], x, y);
	if (seed) this.seed.push(tile);
	else this.history.push(tile);

	this.tiles.push(tile);
	this.grid.set(coord, type_index);

	this.removeFrontier(x, y);
	this.addFrontier(x + 1, y);
	this.addFrontier(x - 1, y);
	this.addFrontier(x, y + 1);
	this.addFrontier(x, y - 1);
    }

    removeFrontier(x, y) {
	const coord = this.coord_index_func(x, y);
	if (this.frontier.has(coord))
	    this.frontier.delete(coord);
    }
    
    addFrontier(x, y) {
	const coord = this.coord_index_func(x, y);
	if (!this.grid.has(coord) && !this.frontier.has(coord))
	    this.frontier.set(coord, [x, y]);
    }

    matchGlues(g1, g2) {
	if (g1 === undefined || g2 === undefined)
	    return 0;
	else if (g1.strength === g2.strength && g1.label === g2.label)
	    return g1.strength;
	else
	    return 0;
    }
    
    getFittingTiles(x, y) {
	const n_coord = this.coord_index_func(x, y + 1);
	const e_coord = this.coord_index_func(x + 1, y);
	const s_coord = this.coord_index_func(x, y - 1);
	const w_coord = this.coord_index_func(x - 1, y);

	const n = this.grid.get(n_coord);
	const e = this.grid.get(e_coord);
	const s = this.grid.get(s_coord);
	const w = this.grid.get(w_coord);

	const fitting_key = this.fitting_index_func(n, e, s, w);

	if (this.fitting_tiles.has(fitting_key)) {
	    return this.fitting_tiles.get(fitting_key);
	} else {
	    const fitting_tiles = [];
	    this.tile_types.forEach((type, index) => {
		let strength = 0;
		if (n !== undefined)
		    strength += this.matchGlues(type.glues.north, this.tile_types[n].glues.south);
		if (e !== undefined)
		    strength += this.matchGlues(type.glues.east, this.tile_types[e].glues.west);
		if (s !== undefined)
		    strength += this.matchGlues(type.glues.south, this.tile_types[s].glues.north);
		if (w !== undefined)
		    strength += this.matchGlues(type.glues.west, this.tile_types[w].glues.east);
		
		if (strength >= this.temperature) fitting_tiles.push(index);
	    });
	    this.fitting_tiles.set(fitting_key, fitting_tiles);
	    return fitting_tiles;
	}
    }

    getPossibleAttachments() {
	const attachments = [];
	
	this.frontier.forEach((loc, coord) => {
	    const x = loc[0];
	    const y = loc[1];
	    
	    this.getFittingTiles(x, y).forEach((index) => {
		attachments.push([x, y, index]);
	    });
	});

	return attachments;
    }

    step() {
	const attachments = this.getPossibleAttachments();

	if (attachments.length > 0) {
	    const attachment = attachments[Math.floor(Math.random()*attachments.length)];

	    const x = attachment[0];
	    const y = attachment[1];
	    const type = attachment[2];
	
	    this.addTile(type, x, y);
	} else {
	    console.log("no more possible attachments");
	}
    }
}

