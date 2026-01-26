//import { Color, parseColor } from './utils.mjs';
import { Color } from "../build/three.module.js"

const DIRECTIONS = ["north", "east", "south", "west", "up", "down"];

export class TileSet {

    constructor() {
		this.clear();
    }

    clear() {
		this.tileTypes = [];
		this.glues = [];

		this.tileTypesByName = new Map();
		this.gluesByLabel = new Map();
    }

    hasTileWithName(name) {
    	return this.tileTypesByName.has(name);
    }

    updateTileType(tid, newType) {
    	// check for duplicate names unless it's the tile being updated
    	if (this.tileTypesByName.has(newType.name)) {
    		if (this.tileTypesByName.get(newType.name).id !== tid)
    			return false;
    	}

    	const oldTile = this.tileTypes[tid];

    	newType.id = tid;
    	for (const dir of DIRECTIONS) {
		    const glue = newType.glues[dir];

		    if (glue === undefined || glue === null || glue.strength == 0) {
				newType.glues[dir] = null;
		    } else {
				newType.glues[dir] = this.findGlue(glue.label, glue.strength, true);
		    }
		}

		this.tileTypes[tid] = newType;
		this.tileTypesByName.delete(oldTile.name);
		this.tileTypesByName.set(newType.name, newType);

		return true;
    }

    removeTileType(tid) {
    	const type = this.tileTypes[tid];

    	this.tileTypesByName.delete(type.name);

    	for (const type of this.tileTypesByName) {
    		if (type.id > tid) {
    			type.id--;
    		}
    	}

    	for (let i = tid; i < this.tileTypes.length - 1; i++) {
    		this.tileTypes[i] = this.tileTypes[i+1];
    		this.tileTypes[i].id = i;
    	}

    	this.tileTypes.pop();
    }

    addTileType(type) {
		if (this.tileTypesByName.has(type.name)) {
		    const existing = this.tileTypesByName.get(type.name);
		    console.log("ERROR: two tiles with the same name:", type, existing);
		    return false;
		}

		const typeToAdd = {
		    name: type.name,
		    label: type.label,
		    color: type.color,
		    glues: {},
		    id: this.tileTypes.length,
		};
		
		for (const dir of DIRECTIONS) {
		    const glue = type.glues[dir];

		    if (glue === undefined || glue === null || glue.strength === 0) {
				typeToAdd.glues[dir] = null;
		    } else {
				const glueToAdd = this.findGlue(glue.label, glue.strength, true);
				typeToAdd.glues[dir] = glueToAdd;
		    }
		}

		this.tileTypes.push(typeToAdd);
		this.tileTypesByName.set(type.name, typeToAdd);

		return true;
    }

    findGlue(label, strength, create=false) {
		if (this.gluesByLabel.has(label)) {
		    const subMap = this.gluesByLabel.get(label);
		    if (subMap.has(strength))
			return subMap.get(strength);
		}

		if (!create)
		    return null;

		const glue = {
		    label: label,
		    strength: strength,
		    id: this.glues.length,
		};
		
		if (!this.gluesByLabel.has(label))
		    this.gluesByLabel.set(label, new Map());
		
		this.glues.push(glue);
		this.gluesByLabel.get(label).set(strength, glue);

		return glue;
    }

    getTileTypes() {
		return this.tileTypes;
    }

    getGlues() {
		return this.glues;
    }
    
    getTileTypeByName(name) {
		if (this.tileTypesByName.has(name))
		    return this.tileTypesByName.get(name);
		else
		    return null;
    }

    getTileTypeById(id) {
		if (this.tileTypes.length > id && id >= 0) 
		    return this.tileTypes[id];
		else
		    return null;
    }

    getGlueById(id) {
		if (id >= 0 && id < this.glues.length)
		    return this.glues[id];
		else
		    return null;
    }

    forEachTileType(callback) {
		for (const tileType of this.tileTypes)
		    callback(tileType);
    }

    fromTDS(tdsData) {
		const lines = tdsData.split("\n");

		this.clear();
		
		let type = {
				name: null,
				label: "",
				color: new Color(1, 1, 1),
				glues: {
				north: { label: "", strength: 0 },
				east:  { label: "", strength: 0 },
				south: { label: "", strength: 0 },
				west:  { label: "", strength: 0 },
				up:  { label: "", strength: 0 },
				down:  { label: "", strength: 0 }
			},
		};

		for (let line of lines) {
		    line = line.split(" ", 2);

		    let cmd = line[0].trim().toLowerCase();
		    let arg = "";
		    if (line.length > 1)
				arg = line[1].trim();

		    if (cmd === "tilename") {
				type.name = arg;
		    } else if (cmd === "label") {
				type.label = arg;
		    } else if (cmd === "northbind") {
				type.glues.north.strength = parseInt(arg);
		    } else if (cmd === "northlabel") {
				type.glues.north.label = arg;
		    } else if (cmd === "eastbind") {
				type.glues.east.strength = parseInt(arg);
		    } else if (cmd === "eastlabel") {
				type.glues.east.label = arg;
		    } else if (cmd === "southbind") {
				type.glues.south.strength = parseInt(arg);
		    } else if (cmd === "southlabel") {
				type.glues.south.label = arg;
		    } else if (cmd === "westbind") {
				type.glues.west.strength = parseInt(arg);
		    } else if (cmd === "westlabel") {
				type.glues.west.label = arg;
			} else if (cmd === "upbind") {
				type.glues.up.strength = parseInt(arg);
			} else if (cmd === "uplabel") {
				type.glues.up.label = arg;
			} else if (cmd === "downbind") {
				type.glues.down.strength = parseInt(arg);
			} else if (cmd === "downlabel") {
				type.glues.down.label = arg;
		    } else if (cmd === "tilecolor") {
				type.color = new Color(arg);// parseColor(arg);
		    } else if (cmd === "create") {
				if (type.name !== null) {
					//console.log('creating tile type');
					//console.log(type);
					this.addTileType(type);
				} else {
					console.log('[ERROR] Invalid tile type: has no name');
				}
				type = {
						name: null,
						label: "",
						color: new Color(1, 1, 1),
						glues: {
						north: { label: "", strength: 0 },
						east:  { label: "", strength: 0 },
						south: { label: "", strength: 0 },
						west:  { label: "", strength: 0 },
						up:  { label: "", strength: 0 },
						down:  { label: "", strength: 0 }
					},
				};
		    }
		}
    }
}
