import * as THREE from '../build/three.module.js';
//import * as TextManager from './textmanager.mjs';
import { Logger } from './logger.mjs';
import { TileSet } from './tileset_3D.mjs';
import { Vector3D, parseColor } from './utils.mjs';
//import { TileBlockAtlas } from './tileblock.mjs';
//import { Editor } from './editor.mjs';
//import { SelectedTile } from './selectedtile.mjs';

const STATE_NO_SYSTEM = -1;
const STATE_DEFAULT = 0;
const STATE_PLACE = 1
const STATE_FAST_FORWARD = 2;
const STATE_FAST_BACK = 3;

const DRAG_SPEED = 1;
const SCROLL_SPEED = 0.2;
const ZOOM_SPEED = 1.2;

const ALL_TEXT_CUTOFF = 25;
const OUTLINE_CUTOFF = 5;

export class TileTypeDrawer {
	static create_tile_type_mesh_function = undefined;
	static grow_tile_type_mesh_function = undefined;
	static scene = undefined;

	constructor(tile_type) {
		this.tile_type = tile_type;
		this.tile_count = 0;
		this.instanceID_dict = {};
		this.mesh_size = 20000;

		const ret_dict = TileTypeDrawer.create_tile_type_mesh_function(tile_type, this.mesh_size);
		this.mesh = ret_dict.mesh;
		this.canvas_change_functions = ret_dict.canvas_change_functions;
		this.textures = ret_dict.textures;

		TileTypeDrawer.scene.add(this.mesh);

		for (let i = 0; i < this.canvas_change_functions.length; i++) {
			this.canvas_change_functions[i]();
		}

		for (let i = 0; i < this.textures.length; i++) {
			this.textures[i].needsUpdate = true;
		}
	}

	add_tile(tile_type, coords) {
		//console.log('adding tile of type ' + type.name + ' at coords (' + coords.x + ',' + coords.y + ',' + coords.z + ')');

		if (this.tile_count >= this.mesh_size) {
			const mesh_ret = TileTypeDrawer.grow_tile_type_mesh_function(this.tile_type, this.mesh);
			this.mesh = mesh_ret.mesh;
			this.mesh_size = mesh_ret.mesh_size;
		}

		const matrix = new THREE.Matrix4();
		matrix.setPosition(coords.x, coords.y, coords.z);

		this.mesh.setMatrixAt(this.tile_count, matrix);
		this.instanceID_dict[this.tile_count] = {coords: coords, type: tile_type};
		this.mesh.instanceMatrix.needsUpdate = true;
		this.tile_count = this.tile_count + 1;
		this.mesh.count = this.tile_count;

		// NOTE: The following has been moved into the animate function
		// At least one of the following is needed for the raycaster to correctly detect intersections. Not sure if both would help.
		//this.mesh.computeBoundingSphere();

		//this.mesh.computeBoundingBox(); // This actually doesn't seem to help...
	}
}

export class Simulator {
	constructor(scene, create_tile_type_mesh_function, grow_tile_type_mesh_function) {

		this.setState(STATE_NO_SYSTEM);

		this.scene = scene;

		this.simulation_mode = 'aTAM';
		this.temperature = 2;
		this.tileset = undefined;
		this.seedTiles = undefined;

		this.tile_list = [];

		TileTypeDrawer.create_tile_type_mesh_function = create_tile_type_mesh_function;
		TileTypeDrawer.grow_tile_type_mesh_function = grow_tile_type_mesh_function;
		TileTypeDrawer.scene = scene;
		this.tile_type_drawer_dict = {}

		this.tileWorker = new Worker('src/tileworker_3D.js');
		this.tileWorker.onmessage = (e) => { this.handleWorkerMessage(e); };

		//this.editor = new Editor(this);
		//this.selectedTile = new SelectedTile(this.scene);

		//this.mouseVec = undefined;

		// this.mouseoverQuad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#0055ff', opacity: 0.2, transparent: true}));
		// this.mouseoverQuad.visible = false;
		// this.scene.add(this.mouseoverQuad);

		//this.renderUpdate = true;
	}

	clear() {
		// this.temperatue = 2;
	}

	reset(keepSeed=false) {
		if (this.tileset === undefined) return false;

		this.tileWorker.postMessage({msg: 'clear', temperature: this.temperature});
		this.refreshTiles();
		this.tile_list = [];
		// this.tileWorker.postMessage({ msg: 'tileset', types: this.tileset.getTileTypes(), glues: this.tileset.getGlues()});

		//this.tileBlockAtlas.clear();

		if (keepSeed) {

			this.tileWorker.postMessage({ msg: 'set-seed', seed: this.seedTiles});

			 for (const tile of this.seedTiles) {
				 this.addTile(tile.type, tile.coords, false);
			 }
			// 	// this.tileWorker.postMessage({ msg: 'add-tile', tid: tile.type.id, x: tile.coords.x, y: tile.coords.y});
			// 	//this.tileBlockAtlas.add(tile.type, tile.coords);
			// }

			Logger.log(Logger.INFO, "reset system to seed");
		} else {
			this.seedTiles = [];
			Logger.log(Logger.INFO, "reset system to empty assembly");
		}

		//this.renderUpdate = true;
	}

	refreshTiles() {
		this.tileWorker.postMessage({ msg: 'tileset', types: this.tileset.getTileTypes(), glues: this.tileset.getGlues()});
	}

	setState(new_state) {
		this.state = new_state;
		return true;

		switch (new_state) {
			case STATE_NO_SYSTEM:
			//this.fastBackButton.disabled = true;
			//this.stepBackButton.disabled = true;
			this.stopButton.disabled = true;
			this.stepForwardButton.disabled = true;
			this.fastForwardButton.disabled = true;
			break;

			case STATE_DEFAULT:
			//this.fastBackButton.disabled = false;
			//this.stepBackButton.disabled = false;
			this.stopButton.disabled = true;
			this.stepForwardButton.disabled = false;
			this.fastForwardButton.disabled = false;
			break;

			case STATE_PLACE:
			//this.fastBackButton.disabled = false;
			//this.stepBackButton.disabled = false;
			this.stopButton.disabled = true;
			this.stepForwardButton.disabled = false;
			this.fastForwardButton.disabled = false;
			break;

			case STATE_FAST_FORWARD:
			// if (this.state !== STATE_DEFAULT && this.state !== STATE_PLACE) return false;
			//this.fastBackButton.disabled = true;
			//this.stepBackButton.disabled = true;
			this.stopButton.disabled = false;
			this.stepForwardButton.disabled = true;
			this.fastForwardButton.disabled = true;
			break;

			case STATE_FAST_BACK:
			// if (this.state !== STATE_DEFAULT && this.state !== STATE_PLACE) return false;
			//this.fastBackButton.disabled = true;
			//this.stepBackButton.disabled = true;
			this.stopButton.disabled = false;
			this.stepForwardButton.disabled = true;
			this.fastForwardButton.disabled = true;
			break;
		}
		this.state = new_state;
		return true;
	}

	handleWorkerMessage(e) {
		if (e.data.msg === "tile-added") {
			const type = this.tileset.getTileTypeById(e.data.tid);
			const coords = new Vector3D(e.data.x, e.data.y, e.data.z);
			//this.tileBlockAtlas.add(type, coords);
			this.addTile(type, coords, false);
			//this.renderUpdate = true;
		} else if (e.data.msg === "tiles-added") {
			const fastForwardBuffer = e.data.buffer;
			const added = e.data.added * 4;
			//console.log(fastForwardBuffer);
			for (let i = 0; i < added; i += 4) {
				const type = this.tileset.getTileTypeById(fastForwardBuffer[i]);
				const coords = new Vector3D(fastForwardBuffer[i+1], fastForwardBuffer[i+2], fastForwardBuffer[i+3]);
				//this.tileBlockAtlas.add(type, coords);
				this.addTile(type, coords, false);
			}
			//this.renderUpdate = true;
		} else if (e.data.msg === "frontier-empty") {
			if (this.state === STATE_FAST_FORWARD) {
				this.onStopButton();
			}
			Logger.log(Logger.INFO, "frontier is empty, no more tiles to add");
		} else if (e.data.msg === "tile-removed") {
			// remove tile from tile block
			this.tileBlockAtlas.stepBackward();
			//this.renderUpdate = true;
		} else if (e.data.msg === "tiles-removed") {
			const backBuffer = e.data.buffer;
			const removed = e.data.removed * 2;
			for (let i = 0; i < removed; i += 2) {
				this.tileBlockAtlas.stepBackward();
			}
			//this.renderUpdate = true;
		} else if (e.data.msg === "back-to-seed") {
			if (this.state === STATE_FAST_BACK) {
				this.onStopButton();
			}
			Logger.log(Logger.INFO, "stepped back to seed, can't step backward anymore");
		} else if (e.data.msg === 'tid-undefined') {
			Logger.log(Logger.WARNING, "found an undefined tile signature during simulation. simulation will continue, but there is likely a problem with the tileset");
		} else if (e.data.msg === 'sent-history') {
			this.createSvgSnapshot(e.data.history, e.data.b_show_names, e.data.b_show_labels);
		} else if (e.data.msg === 'nondeterminism') {
			Logger.log(Logger.WARNING, `nondeterminism detected at location (${e.data.loc}) where the following tile types can attach: ${e.data.types}`);
		}
	}

	stepForward() {
		this.tileWorker.postMessage({ msg: "step-forward" });
	}

	stepBackward() {
		this.tileWorker.postMessage({ msg: "step-backward" });
	}

	startFastForward() {
		if (this.setState(STATE_FAST_FORWARD)) {
			this.tileWorker.postMessage({msg: "fast-forward-start"});
		}
	}

	startFastBackward() {
		if (this.setState(STATE_FAST_BACK)) {
			this.tileWorker.postMessage({msg: "fast-backward-start"});
		}
	}

	onStopButton() {
		if (this.state === STATE_FAST_FORWARD) {
			this.tileWorker.postMessage({msg: "fast-forward-stop"});
		} else if (this.state === STATE_FAST_BACK) {
			this.tileWorker.postMessage({msg: "fast-backward-stop"});
		}
		this.setState(STATE_DEFAULT);
	}

	// init() {
	// 	this.editor.init();
	// 	this.selectedTile.init();
	//
	// 	TextManager.init(this.scene, this.canvas);
	// 	this.tileBlockAtlas = new TileBlockAtlas(this.scene);
	// }
	//
	// resize() {
	// 	const rect = this.canvas.getBoundingClientRect();
	// 	const width = rect.width;
	// 	const height = rect.height;
	//
	// 	this.renderer.setSize(width, height, false);
	//
	// 	const aspect = width / height;
	//
	// 	this.camera.left = -aspect;
	// 	this.camera.right = aspect;
	// 	this.camera.top = 1;
	// 	this.camera.bottom = -1;
	// 	this.camera.zoom = Math.pow(2, this.zoomLevel);
	// 	this.camera.updateProjectionMatrix();
	//
	// 	this.renderUpdate = true;
	//
	// 	this.selectedTile.resize();
	// }

	// render() {
	// 	if (this.renderUpdate) {
	// 		this.renderUpdate = false;
	//
	// 		TextManager.clearText();
	//
	// 	    // size in pixels of a tile
	// 	    const pxTileSize = this.canvas.clientHeight * Math.pow(2, this.zoomLevel - 1);
	// 	    if (pxTileSize >= ALL_TEXT_CUTOFF) {
	// 	    	const screenMin = new Vector2D( this.camera.position.x + this.camera.left / this.camera.zoom,
	// 	    		this.camera.position.y + this.camera.bottom / this.camera.zoom ).round();
	// 	    	const screenMax = new Vector2D( this.camera.position.x + this.camera.right / this.camera.zoom,
	// 	    		this.camera.position.y + this.camera.top / this.camera.zoom ).round();
	// 	    	this.tileBlockAtlas.forTilesInRegion(screenMin, screenMax, TextManager.addTileGlyphs);
	// 	    	TextManager.update(this.scene, this.canvas);
	// 	    }
	//
	// 	    // render tiles, but hide outlines if tiles are too small
	// 	    this.tileBlockAtlas.setVisible(true, pxTileSize >= OUTLINE_CUTOFF)
	//
	// 	    // render main simulation scene
	// 	    this.renderer.setClearColor(this.backgroundColor);
	// 	    this.renderer.render(this.scene, this.camera);
	//   	}
	//
	// 	this.selectedTile.render();
	// 	let infoStr = `Simulator: ${this.tileBlockAtlas.numTiles} tiles`;
	// 	if (this.mouseoverQuad.visible) {
	// 		infoStr += ` --- Mouse Coordinates: (${this.mouseoverQuad.position.x}, ${this.mouseoverQuad.position.y})`
	// 	}
	// 	this.infoBar.innerHTML = infoStr;
	// }

	setTemperature(temp) {
		this.temperature = temp;
		this.tileWorker.postMessage({ msg: 'set-temperature', temperature: temp});
		//Logger.log(Logger.INFO, `set simulation temperature to ${temp}`);
		this.reset(true);
	}

	setBackgroundColor(colStr, log=true) {
		const color = parseColor(colStr);
		this.backgroundColor = color.getRGBInt();
		//this.renderUpdate = true;

		if (log) {
			const r = Math.round(color.r * 255);
			const g = Math.round(color.g * 255);
			const b = Math.round(color.b * 255);

			Logger.log(Logger.INFO, `set background color to "${colStr}" (red: ${r}, green: ${g}, blue: ${b})`);
		}
	}

	// selectTile(tileType) {
	// 	this.selectedTile.selectTile(tileType);
	// 	this.editor.onSelectTile(tileType);
	// }

	addTile(type, coords, b_post_message=true) {
		if (!(type.name in this.tile_type_drawer_dict)) {
			this.tile_type_drawer_dict[type.name] = new TileTypeDrawer(type);
		}
		this.tile_type_drawer_dict[type.name].add_tile(type, coords);
		if (b_post_message) {
			this.tileWorker.postMessage({msg: 'add-tile', tid: type.id, x: coords.x, y: coords.y, z: coords.z});
		}
		this.tile_list.push([type.name, coords]);
	}

	removeTile(coords) {
		this.tileWorker.postMessage({ msg: 'remove-tile', x: coords.x, y: coords.y, z: coords.z});
		//this.tileBlockAtlas.remove(coords);

		//this.renderUpdate = true;
	}

	simulationModeOption(){
		const choice = document.getElementById('simulation-mode-select').value;
		this.simulation_mode = choice;
		if (choice === 'aTAM') {
			Logger.log(Logger.INFO, "Setting simulation mode to aTAM");
			this.tileWorker.postMessage({msg: "mode-aTAM"});
		}
		else if (choice === 'SyncTAM') {
			Logger.log(Logger.INFO, "Setting simulation mode to SyncTAM");
			this.tileWorker.postMessage({msg: "mode-SyncTAM"});
		}
	}

	loadSystem(data) {
		if (data['tdp'] !== undefined && data['tds'] !== undefined) {

			this.parseTDSfile(data['tds'].name, data['tds'].src);

			this.parseTDPfile(data['tdp'].name, data['tdp'].src);

			// this.tileWorker.postMessage({ msg: 'tileset', types: this.tileset.getTileTypes(), glues: this.tileset.getGlues()})
			// Logger.log(Logger.INFO, `loaded tileset file "${data.tds.name}" with ${this.tileset.getTileTypes().length} tile types`);
			//
			// this.tileWorker.postMessage({ msg: 'set-seed', seed: this.seedTiles});
			//
			// this.setState(STATE_DEFAULT);
			// this.renderUpdate = true;
		}
	}

	parseTDPfile(tdp_file_name, tdp_data) {
		let temp = 2;
		this.seedTiles = [];

		const lines = tdp_data.split("\n");
		for (let line of lines.slice(1)) {
			line = line.trim();
			if (line.toLowerCase().startsWith("temperature")) {
				temp = parseInt(line.split("=")[1].trim());
			} else if (line.length > 0) {
				const data = line.split(" ");
				if (data.length >= 3) {
					const name = data[0].trim();
					const x = parseInt(data[1].trim());
					const y = parseInt(data[2].trim());
					let z = 0;
					if (data.length >= 4) {
						z = parseInt(data[3].trim());
					}

					const type = this.tileset.getTileTypeByName(name);
					const coords = new Vector3D(x, y, z);

					//this.addTile(type, coords);
					//this.tileWorker.postMessage({ msg: 'add-tile', tid: type.id, x: coords.x, y: coords.y, z: coords.z});
					//this.tileBlockAtlas.add(type, coords);
					this.seedTiles.push({type: type, coords: coords});

					//const matrix = new THREE.Matrix4();
					//matrix.setPosition( x, y, z );

					//this.tile_type_mesh_map.get(name).setMatrixAt(0, matrix);
					//console.log(this.tile_type_mesh_map.get(name).count);
				}
			}
		}

		this.tdp_name = tdp_file_name;
		//Logger.log(Logger.INFO, `loaded system file "${tdp_file_name}" with a seed of size ${this.seedTiles.length}`);
		console.log(`loaded system file "${tdp_file_name}" with a seed of size ${this.seedTiles.length}`);
		this.setTemperature(temp);
		//console.log(this.seedTiles);
	}

	parseTDSfile(tds_file_name, tds_data) {

		this.clear();
		this.tileset = new TileSet();
		this.tileset.fromTDS(tds_data);
		this.tds_name = tds_file_name;

		this.tile_type_mesh_map = new Map();
		this.tile_type_counts = {};
		this.instanceId_maps = {};
		// for (let i=0; i<this.tileset.getTileTypes().length; i++) {
		// 	this.add_tile_type_for_drawing(this.tileset.tileTypes[i]);
		// }
		// this.call_canvas_change_functions();

		this.tileWorker.postMessage({ msg: 'tileset', types: this.tileset.getTileTypes(), glues: this.tileset.getGlues()})
		//Logger.log(Logger.INFO, `loaded tileset file "${tds_file_name}" with ${this.tileset.getTileTypes().length} tile types`);

	}

	// create_tile_type_mesh(tile_type) {
	// 	const materials = Array();
	//
	// 	const face_order = ["up", "down", "west", "east", "north", "south"];
	//
	// 	for (let i=0; i<6; i++) {
	// 		const canvas = document.createElement('canvas'),
	// 			ctx = canvas.getContext('2d')
	// 		//canvas_count += 1;
	// 		function changeCanvas() {
	// 			//console.log('calling changeCanvas for ' + tile_type.name);
	// 			ctx.fillStyle = 'white';
	// 			ctx.fillRect(0, 0, canvas.width, canvas.height);
	// 			ctx.strokeRect(0, 0, canvas.width, canvas.height);
	//
	// 			// starting with the front face, then the back face, followed by the left, right, top, and bottom faces
	// 			const glue = tile_type.glues[face_order[i]];
	// 			if ((glue !== undefined) && (glue.strength > 0)) {
	// 				ctx.font = '30pt Arial';
	// 				ctx.fillStyle = 'black';
	// 				ctx.textAlign = 'center';
	// 				ctx.textBaseline = 'middle';
	//
	// 				if (glue.strength === 1) {
	// 					ctx.fillText(`${glue.label}`, canvas.width / 2, canvas.height / 2);
	// 				} else {
	// 					ctx.fillText(`${glue.label}`, canvas.width / 2, canvas.height / 2);
	// 					ctx.strokeRect(canvas.width / 10, canvas.height / 10, 8 * (canvas.width / 10), 8 * (canvas.height / 10));
	// 				}
	// 			}
	// 		}
	// 		this.canvas_change_functions.push(changeCanvas);
	// 		canvas.width = canvas.height = this.text_canvas_size;
	//
	// 		const texture = new THREE.Texture(canvas);
	// 		this.textures.push(texture);
	// 		const material = new THREE.MeshStandardMaterial({ map: texture, color: tile_type.color });
	// 		materials.push(material);
	// 	}
	//
	// 	const geometry = new THREE.BoxGeometry();
	// 	const mesh = new THREE.InstancedMesh( geometry, materials, this.tile_type_mesh_size );
	// 	return mesh;
	// }

	saveSystem(filename) {
		// return [new Blob(['tdp']), new Blob(['tds'])]

		if (this.tileset === undefined) {
			return null;
		}

		let tdpData = `${filename}.tds\n`;
		tdpData += `temperature=${this.temperature}\n`;

		for (const tile of this.tileBlockAtlas.getAllTiles()) {
			tdpData += `${tile.type.name} ${tile.coords.x} ${tile.coords.y}\n`;
		}

		let tdsData = '';
		for (const type of this.tileset.getTileTypes()) {
			tdsData += `TILENAME ${type.name}\n`;
			tdsData += `LABEL ${type.label}\n`;

			for (const dir of ['north', 'east', 'south', 'west']) {

				const dirCap = dir.toUpperCase();

				if (type.glues[dir] !== null) {
					tdsData += `${dirCap}BIND ${type.glues[dir].strength}\n`;
					tdsData += `${dirCap}LABEL ${type.glues[dir].label}\n`;
				}
			}

			tdsData += `TILECOLOR ${type.color.getHexString()}\n`;
			tdsData += `CREATE\n\n`;
		}

		return [new Blob([tdpData]), new Blob([tdsData])];
	}

	// initCanvasEvents() {
	// 	const _this = this;
	//
	//   	// camera dragging events
	//   	let prevMousePos;
	//   	let currMousePos;
	//   	const onDragCamera = function (e) {
	//   		const rect = e.target.getBoundingClientRect();
	//   		currMousePos = new Vector2D(e.clientX - rect.left, e.clientY - rect.top);
	//
	//   		_this.dragCamera(currMousePos, prevMousePos);
	//
	//   		prevMousePos = currMousePos;
	//
	//   	};

	  	// this.canvas.addEventListener('pointermove', (e) => {
	  	// 	const rect = _this.canvas.getBoundingClientRect();
		//
		// 	const mousePos = new Vector2D(e.clientX - rect.left, rect.bottom - e.clientY);
		// 	const canvasDims = new Vector2D(rect.right - rect.left, (rect.bottom - rect.top));
		// 	const mouseProj = mousePos.div(canvasDims).scale(2).sub(new Vector2D(1, 1));
		// 	this.mouseVec = new THREE.Vector4(mouseProj.x, mouseProj.y, 0, 1);
		//
	  	// 	// console.log(this.mousePos);
	  	// }, false);

	  	// this.canvas.addEventListener('pointerdown', (e) => {
	  	// 	const rect = _this.canvas.getBoundingClientRect();
	  	// 	prevMousePos = new Vector2D(e.clientX - rect.left, e.clientY - rect.top);
		//
	  	// 	_this.canvas.addEventListener('pointermove', onDragCamera, false);
	  	// 	_this.canvas.addEventListener('pointerup', function handler(e) {
	  	// 		_this.canvas.removeEventListener('pointermove', onDragCamera);
	  	// 		_this.canvas.removeEventListener('pointerup', handler);
	  	// 	}, false);
	  	// }, false);
		//
	  	// // camera scrolling events
	  	// this.canvas.addEventListener('wheel', (e) => { _this.scrollCamera(Math.sign(e.deltaY)); }, false);
		//
	  	// // this.touchListener = new TransformRecognizer(this.canvas);
		//
	  	// this.initSelectTileEvents();
	// }

	// initSelectTileEvents() {
	//
	// 	let mouseLoc = undefined;
	//
	// 	this.canvas.addEventListener('mousemove', (e) => {
	// 		const rect = this.canvas.getBoundingClientRect();
	// 		const mousePos = new Vector2D(e.clientX - rect.left, rect.bottom - e.clientY);
	// 		const canvasDims = new Vector2D(rect.right - rect.left, (rect.bottom - rect.top));
	//
	// 		// mouse location in projected screen space
	// 		const mouseProj = mousePos.div(canvasDims).scale(2).sub(new Vector2D(1, 1));
	// 		const mouseVec = new THREE.Vector4(mouseProj.x, mouseProj.y, 0, 1);
	// 		mouseVec.applyMatrix4(this.camera.projectionMatrixInverse);
	//
	// 		mouseLoc = new Vector2D(mouseVec.x + this.camera.position.x, mouseVec.y + this.camera.position.y).round();
	//
	// 		this.mouseoverQuad.position.x = mouseLoc.x;
	// 		this.mouseoverQuad.position.y = mouseLoc.y;
	// 		this.mouseoverQuad.position.z = 1;
	// 		this.mouseoverQuad.visible = true;
	// 		this.renderUpdate = true;
	// 	}, false);
	//
	// 	this.canvas.addEventListener('mouseenter', (e) => {
	// 		this.mouseoverQuad.visible = true;
	// 		this.renderUpdate = true;
	// 	}, false);
	// 	this.canvas.addEventListener('mouseleave', (e) => {
	// 		this.mouseoverQuad.visible = false;
	// 		this.renderUpdate = true;
	// 		//this.mouseLoc = undefined;
	// 	}, false);
	//
	// 	this.canvas.addEventListener('click', (e) => {
	// 		if (this.state === STATE_DEFAULT) {
	// 			if (mouseLoc !== undefined) {
	// 	  			const selectedTile = this.tileBlockAtlas.getTileAtLocation(mouseLoc);
	// 	  			if (selectedTile !== null) {
	// 	  				this.selectTile(selectedTile.type);
	// 	  			}
	// 	  		}
	// 		} else if (this.state === STATE_PLACE) {
	// 			if (mouseLoc !== undefined) {
	// 				const selectedTile = this.tileBlockAtlas.getTileAtLocation(mouseLoc);
	// 				if (selectedTile === null) {
	// 					const editorTile = this.editor.selectedType;
	// 					if (editorTile) {
	// 						this.addTile(editorTile, mouseLoc);
	// 					}
	// 				} else {
	// 					this.removeTile(mouseLoc);
	// 				}
	// 			}
	// 		}
	// 	}, false);
	// }
	//
	// zoomIn() {
	// 	this.zoomLevel += ZOOM_SPEED;
	// 	this.zoom();
	// }
	//
	// zoomOut() {
	// 	this.zoomLevel -= ZOOM_SPEED;
	// 	this.zoom();
	// }
	//
	// zoom(preserveMouse=false) {
	//
	// 	if (preserveMouse) {
	//
	// 		let mouseVecBefore = this.mouseVec.clone();
	// 		let mouseVecAfter = this.mouseVec.clone();
	//
	// 		mouseVecBefore.applyMatrix4(this.camera.projectionMatrixInverse);
	//
	// 		// mouseLoc = new Vector2D(mouseVecBefore.x + this.camera.position.x, mouseVecInvProj.y + this.camera.position.y).round();
	//
	// 		this.camera.zoom = Math.pow(2, this.zoomLevel);
	// 		this.camera.updateProjectionMatrix();
	//
	// 		mouseVecAfter.applyMatrix4(this.camera.projectionMatrixInverse);
	//
	// 		const offset = mouseVecBefore.sub(mouseVecAfter);
	// 		this.camera.position.add(new THREE.Vector3(offset.x, offset.y, offset.z));
	// 	} else {
	// 		this.camera.zoom = Math.pow(2, this.zoomLevel);
	// 		this.camera.updateProjectionMatrix();
	// 	}
	// 	this.renderUpdate = true;
	// 	// console.log(this.camera);
	// }
	//
	// zoomToScale(scale, x, y) {
	// 	let new_zoom = this.camera.zoom * scale;
	// 	this.zoomLevel = Math.log(new_zoom) / Math.log(2);
	// 	this.zoom();
	// }

	// dragCamera(currMousePos, prevMousePos) {
	// 	const currMouse = currMousePos.scale(2 / this.canvas.clientHeight).sub(new Vector2D(1, 1));
	// 	const prevMouse = prevMousePos.scale(2 / this.canvas.clientHeight).sub(new Vector2D(1, 1));
	//
	// 	const mouseDiff = currMouse.sub(prevMouse).scale(DRAG_SPEED / Math.pow(2, this.zoomLevel));
	//
	// 	this.camera.translateX(-mouseDiff.x);
	// 	this.camera.translateY(mouseDiff.y);
	//
	// 	this.renderUpdate = true;
	// }
	//
	// scrollCamera(amt) {
	// 	this.zoomLevel -= amt * SCROLL_SPEED;
	// 	this.zoom(true);
	// }

		//png function
	// async renderCanvasAndSave() {
	// 	//const filename = 'test_png.png';//document.getElementById('save-png-image-name').value;
	//
	// 	const pickerOptions = {
	// 		suggestedName: `${this.tdp_name.substring(0, this.tdp_name.length - 4)}.png`,
	// 		types: [
	// 				{
	// 				  description: 'PNG Image File',
	// 				  accept: {
	// 					  'img/png': ['.png'],
	// 				  },
	// 				},
	// 		],
	// 	};
	// 	let filename = undefined;
	// 	const fileHandle = await window.showSaveFilePicker(pickerOptions);
	// 	filename = fileHandle.name;
	//
	// 	if (filename === undefined) {
	// 		return;
	// 	}
	//
	// 	const canvas = document.getElementById('sim-canvas');
	// 	if (!canvas) {
	// 		console.log('Unable to find the canvas element!');
	// 		return;
	// 	}
	// 	// Simulate opening the page and waiting for it to render
	// 	window.setTimeout(function () {
	// 		try {
	// 			// Capture the canvas content
	// 			html2canvas(canvas).then(async function(canvas) {
	// 				// const writable = await fileHandle.createWritable();
	// 				// const base64_data = canvas.toDataURL('image/png');
	// 				// const foo = base64_data.substring('data:image/png;base64,'.length);
	// 				// await writable.write(window.atob(foo));
	// 				// await writable.close();
	//
	// 				const link = document.createElement('a');
	// 				link.download = filename;
	// 				link.href = canvas.toDataURL();
	// 				link.click();
	// 			}).catch((error) => {
	// 				console.error('Error capturing screen:', error);
	// 			});
	// 		} catch (error) {
	// 			console.error('Error during canvas rendering:', error);
	// 		}
	// 	}, 200); // Adjust the timeout as needed
	// 	Logger.log(Logger.INFO, `saved current image as ${filename}`);
	// }

	// add_glue_lines(svgNS, tile_group, x, y, orientation, glue, direction) {
	// 	const line_props = `M${x} ${y} ${orientation}1`;
	// 	const line = document.createElementNS(svgNS, "path");
	// 	const second_line_offsets = {'north': {x:0, y:0.05}, 'south': {x:0, y:-0.05}, 'east': {x:-0.05, y:0}, 'west': {x:0.05, y:0}};
	// 	line.setAttribute("d", line_props);
	// 	line.setAttribute("stroke", "black");
	// 	line.setAttribute("stroke-width", 0.025);
	// 	if (glue === undefined || glue === null || glue.strength === 0) {
	// 		line.setAttribute("stroke-dasharray", "0.05,0.05");
	// 	} else if (glue.strength === 2) {
	// 		const line2_props = `M${x + second_line_offsets[direction].x} ${y + second_line_offsets[direction].y} ${orientation}1`;
	// 		const line2 = document.createElementNS(svgNS, "path");
	// 		line2.setAttribute("d", line2_props);
	// 		line2.setAttribute("stroke", "black");
	// 		line2.setAttribute("stroke-width", 0.025);
	// 		tile_group.appendChild(line2);
	// 	}
	// 	tile_group.appendChild(line);
	// }

	getTileSVGGroup(svgNS, svgHeight, tile, x, y, b_show_names, b_show_labels) {
		const tile_group = document.createElementNS(svgNS, "g");

		const rect = document.createElementNS(svgNS, "rect");
		rect.setAttribute("x", x);
		rect.setAttribute("y", svgHeight - y - 1);
		rect.setAttribute("width", 1);
		rect.setAttribute("height", 1);
		let fillColor = `rgb(${tile.color.r * 256}, ${tile.color.g * 256}, ${tile.color.b * 256})`;
		rect.setAttribute("fill", fillColor);
		//rect.setAttribute("stroke", "black");
		//rect.setAttribute("stroke-width", 0.025);
		rect.setAttribute("stroke-width", 0);
		//add the rect to the svg
		tile_group.appendChild(rect);

		this.add_glue_lines(svgNS, tile_group, x, svgHeight - y - 1, "h", tile.glues['north'], 'north')
		this.add_glue_lines(svgNS, tile_group, x, svgHeight - y, "h", tile.glues['south'], 'south')
		this.add_glue_lines(svgNS, tile_group, x, svgHeight - y - 1, "v", tile.glues['west'], 'west')
		this.add_glue_lines(svgNS, tile_group, x + 1, svgHeight - y - 1, "v", tile.glues['east'], 'east')

		if (b_show_names === true) {
			//add tile name and label to the svg
			const name = document.createElementNS(svgNS, "text");
			name.setAttribute("x", x + 0.5);
			name.setAttribute("y", svgHeight - y - 0.38);
			name.setAttribute("fill", "black");
			name.setAttribute("font-size", 0.1);
			name.setAttribute("stroke-width", 0.025);
			name.setAttribute("text-anchor", "middle"); // Center text horizontally
			name.setAttribute("dominant-baseline", "middle");
			name.textContent = tile.name;
			tile_group.appendChild(name);
		}

		if (b_show_labels === true) {
			const label = document.createElementNS(svgNS, "text");
			label.setAttribute("x", x + 0.5);
			label.setAttribute("y", svgHeight - y - 0.52);
			label.setAttribute("fill", "black");
			label.setAttribute("font-size", 0.1);
			label.setAttribute("stroke-width", 0.025);
			label.setAttribute("text-anchor", "middle"); // Center text horizontally
			label.setAttribute("dominant-baseline", "middle");
			label.textContent = tile.label;
			tile_group.appendChild(label);
		}
		return tile_group;
	}

	// Initiate drawing of SVG by requesting the worker thread to send the assembly's history
	initiateSvgSnapshot() {
		document.getElementById('save-svg-modal').style.display='none';
		const b_show_names = document.getElementById("save-svg-tile-type-name").checked;
		const b_show_labels = document.getElementById("save-svg-tile-type-label").checked;

		this.tileWorker.postMessage({ msg: 'send-history', b_show_names: b_show_names, b_show_labels: b_show_labels});
	}

	// Use the assembly's history to draw it to an SVG file
	async createSvgSnapshot(assembly_history, b_show_names, b_show_labels) {

		const pickerOptions = {
			suggestedName: `${this.tdp_name.substring(0, this.tdp_name.length - 4)}.svg`,
			types: [
					{
					  description: 'SVG File',
					  accept: {
						  'svg/svg': ['.svg'],
					  },
					},
			],
		};
		let fileName = undefined;
		const fileHandle = await window.showSaveFilePicker(pickerOptions);
		fileName = fileHandle.name;

		if (fileName === undefined) {
			return;
		}

		const assembly_array = []
		this.seedTiles.forEach((seedTile) => {
			assembly_array.push({tid: seedTile.type.id, x: seedTile.coords.x, y: seedTile.coords.y});
		})
		assembly_history.forEach((tile) => {
			assembly_array.push(tile);
		})

		//const canvas = document.getElementById('sim-canvas');
		const svgNS = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(svgNS, "svg");

		// Calculate the bounding box of the simulation
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		assembly_array.forEach((tile) => {
			if (tile.x < minX) minX = tile.x;
			if (tile.y < minY) minY = tile.y;
			if (tile.x > maxX) maxX = tile.x;
			if (tile.y > maxY) maxY = tile.y;
		});

		const svgWidth = maxX - minX + 1;
		const svgHeight = maxY - minY + 1;

		svg.setAttribute("width", svgWidth);
		svg.setAttribute("height", svgHeight);
		svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

		const tileset = this.tileset.getTileTypes();
		const defs = document.createElementNS(svgNS, "defs");
		const tiles_group = document.createElementNS(svgNS, "g");
		const tileset_groups = {};

		assembly_array.forEach((tile_info) => {
			const tile_id = `tile${tile_info.tid}`;
			if (!(tile_info.tid in tileset_groups)) {	// If a def hasn't been made yet for this tile type, make it now
				const tile = tileset[tile_info.tid];
				const tile_group = this.getTileSVGGroup(svgNS, 0, tile, 0, 0, b_show_names, b_show_labels)
				tile_group.setAttribute("id", tile_id);
				defs.append(tile_group);
				tileset_groups[tile_info.tid] = tile_id;
			}

			const x = tile_info.x - minX;
			const y = svgHeight - (tile_info.y - minY);

			// Create a link to the group def for this tile type at the necessary translation
			//  Example: <use xlink:href="#tile2" x="3" y="3"/>
			const use_element = document.createElementNS(svgNS, "use");
			use_element.setAttribute("xlink:href", `#${tile_id}`);
			use_element.setAttribute("x", x);
			use_element.setAttribute("y", y);
			tiles_group.append(use_element);
		});
		svg.append(defs);

		// Apply the background color to the SVG using a rect element
		const b = this.backgroundColor % 256;
		const g = (this.backgroundColor / 256) % 256;
		const r = ((this.backgroundColor / 256) / 256) % 256;
		const rect = document.createElementNS(svgNS, "rect");
		rect.setAttribute("width", "100%");
		rect.setAttribute("height", "100%");
		rect.setAttribute("fill", `rgb(${r}, ${g}, ${b})`);
		svg.appendChild(rect);

		// Add the group with the assembly's tiles
		svg.append(tiles_group);

		// Serialize the SVG to a string
		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(svg);

		const writable = await fileHandle.createWritable();
		await writable.write(svgString);
		await writable.close();

		// // Create a blob and a link to download the SVG
		// const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
		// const url = URL.createObjectURL(blob);
		// const link = document.createElement("a");
		// link.href = url;
		// link.download = fileName;
		// document.body.appendChild(link);
		// link.click();
		// document.body.removeChild(link);
		// URL.revokeObjectURL(url);

		Logger.log(Logger.INFO, `saved current assembly as SVG file ${fileName}`);
	}
}

// TOUCH EVENTS

// function scaler(arg) {
// 	this.zoomToScale(arg.scale, arg.x, arg.y);
// }
//
// function dragger(arg) {
// 	this.dragCamera(arg.current_position, arg.previous_position);
// }

// function TransformRecognizer(element) {
//   // Reference positions for the start of the transformation.
//   this.referencePair = null;
//   this.referencePoint = null;
//
//   // Bind touch event handlers to this element.
//   element.addEventListener('touchstart', this.touchStartHandler.bind(this));
//   element.addEventListener('touchmove', this.touchMoveHandler.bind(this));
//   element.addEventListener('touchend', this.touchEndHandler.bind(this));
//   this.element = element;
//
//   // Object of callbacks this function provides.
//   this.callbacks = {
//   	rotate: null,
//   	scale: scaler,
//   	drag: dragger
//   };
//
//   // Define gesture states.
//   this.Gestures = {
//   	NONE: 0,
//   	ROTATE: 1,
//   	SCALE: 2,
//   	DRAG: 3
//   };
//   // Define thresholds for gestures.
//   this.Thresholds = {
//     SCALE: 0.1,   // percentage difference. [This is unused.]
//     ROTATION: 5,  // degrees.
// 	DISTANCE: 2   // pixels
// };
//   // The current gesture of this transformation.
//   this.currentGesture = this.Gestures.NONE;
// }

