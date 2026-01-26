import * as THREE from './three.module.mjs';
import * as AssetManager from './assetmanager.mjs';
import { Vector2D } from './utils.mjs';

const tileGeometry = new THREE.PlaneGeometry(1, 1);
const tileMaterial = new THREE.MeshBasicMaterial();

//const outlineGeometry = new THREE.PlaneGeometry(1.03125, 1.03125);
const outlineGeometry = new THREE.InstancedBufferGeometry();
const outlineMaterial = new THREE.ShaderMaterial();

const BLOCK_WIDTH = 32;
const BLOCK_HEIGHT = 32;
const BLOCK_SIZE = BLOCK_WIDTH * BLOCK_HEIGHT;
const BLOCK_DIMS = new Vector2D(BLOCK_WIDTH, BLOCK_HEIGHT);

const OUTLINE_SIZE = 1.03125;

class TileBlock {
    constructor(origin) {
		this.origin = origin;
		
		this.tileMesh = new THREE.InstancedMesh(tileGeometry, tileMaterial, BLOCK_SIZE);
		this.tileMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		this.tileMesh.count = 0;

		this.outlineGeometry = outlineGeometry.clone();
		this.outlineGeometry.instanceCount = 0;
		this.outlineMesh = new THREE.Mesh(this.outlineGeometry, outlineMaterial, BLOCK_SIZE);
		this.outlineMesh.frustumCulled = false;
		
		this.tileData = new Array();
		this.indexMap = new Array(BLOCK_SIZE); // maps block locations to array indices of tiles
   	}

    contains(coords) {
		const offset = coords.sub(this.origin);
		return offset.x >= 0 && offset.x < BLOCK_WIDTH &&
		       offset.y >= 0 && offset.y < BLOCK_HEIGHT;
    }

    add(type, coords) {
		if (!this.contains(coords)) {
		    console.log("ERROR: attempting to add tile to invalid tile block");
		    return false;
		}

		const offset = coords.sub(this.origin);
		const key = offset.x + offset.y * BLOCK_WIDTH;
		if (this.indexMap[key] !== undefined) {
		    console.log("ERROR: attempting to add tile to occupied location in tile block");
		    return false;
		}

		this.indexMap[key] = this.tileData.length;
		this.tileData.push({type: type, coords: coords});

		// there's a cleaner way to do this, but I'm lazy
		const dummy = new THREE.Object3D();
		dummy.position.x = coords.x;
		dummy.position.y = coords.y;
		dummy.updateMatrix();
		this.tileMesh.setMatrixAt(this.tileMesh.count, dummy.matrix);

		const color = new THREE.Color(type.color.r, type.color.g, type.color.b);
		this.tileMesh.setColorAt(this.tileMesh.count, color);

		this.tileMesh.count++;
		this.tileMesh.instanceMatrix.needsUpdate = true;
		this.tileMesh.instanceColor.needsUpdate = true;
		
		const offsetAttrib = this.outlineGeometry.attributes.offset.array;
		offsetAttrib[3 * this.outlineGeometry.instanceCount + 0] = coords.x;
		offsetAttrib[3 * this.outlineGeometry.instanceCount + 1] = coords.y;
		offsetAttrib[3 * this.outlineGeometry.instanceCount + 2] = 0;

		const strengthsAttrib = this.outlineGeometry.attributes.strengths.array;
		if (type.glues.north !== null)
		    strengthsAttrib[4 * this.outlineGeometry.instanceCount + 0] = type.glues.north.strength;
		if (type.glues.east !== null)
		    strengthsAttrib[4 * this.outlineGeometry.instanceCount + 1] = type.glues.east.strength;
		if (type.glues.south !== null)
		    strengthsAttrib[4 * this.outlineGeometry.instanceCount + 2] = type.glues.south.strength;
		if (type.glues.west !== null)
		    strengthsAttrib[4 * this.outlineGeometry.instanceCount + 3] = type.glues.west.strength;

		this.outlineGeometry.attributes.offset.needsUpdate = true;
		this.outlineGeometry.attributes.strengths.needsUpdate = true;
		this.outlineGeometry.instanceCount++;

		return true;
    }

    // removing by coords is inefficient since we have to splice arrays, but that's fine if it's only done infrequently
    remove(coords) {
    	if (!this.contains(coords))
    		return false;

    	const offset = coords.sub(this.origin);
    	const key = offset.x + offset.y * BLOCK_WIDTH;

    	if (this.indexMap[key] === undefined)
    		return false;

    	const index = this.indexMap[key];
    	this.tileData.splice(index, 1);

    	// shift attributes to fill in empty space if we are removing an item from the middle
    	if (index !== this.tileMesh.count - 1) {
    		const matrixArray = this.tileMesh.instanceMatrix.array;
    		const colorArray = this.tileMesh.instanceColor.array;
    		const offsetArray = this.outlineGeometry.attributes.offset.array;
    		const strengthArray = this.outlineGeometry.attributes.strengths.array;

    		const matrixItemSize = this.tileMesh.instanceMatrix.itemSize;
    		const colorItemSize = this.tileMesh.instanceColor.itemSize;
    		const offsetItemSize = this.outlineGeometry.attributes.offset.itemSize;
    		const strengthItemSize = this.outlineGeometry.attributes.strengths.itemSize;

    		matrixArray.set(matrixArray.slice(matrixItemSize * (index + 1)), index * matrixItemSize);
    		colorArray.set(colorArray.slice(colorItemSize * (index + 1)), index * colorItemSize);
    		offsetArray.set(offsetArray.slice(offsetItemSize * (index + 1)), index * offsetItemSize);
    		strengthArray.set(strengthArray.slice(strengthItemSize * (index + 1)), index * strengthItemSize);
    		
    		this.tileMesh.instanceMatrix.needsUpdate = true;
			this.tileMesh.instanceColor.needsUpdate = true;
    		this.outlineGeometry.attributes.offset.needsUpdate = true;
	    	this.outlineGeometry.attributes.strengths.needsUpdate = true;

	    	for (let i = 0; i < this.indexMap.length; i++) {
	    		if (this.indexMap[i] > index) {
	    			this.indexMap[i]--;
	    		}
	    	}
    	}

    	this.tileMesh.count--;
    	this.outlineGeometry.instanceCount--;

    	this.indexMap[key] = undefined;
    	
    	return true;
    }

    getTile(coords) {
    	const offset = coords.sub(this.origin);
		const key = offset.x + offset.y * BLOCK_WIDTH;
		const index = this.indexMap[key];
		if (index !== undefined) {
			return this.tileData[index];
		}
		return null;
    }

    addToScene(scene) {
		scene.add(this.tileMesh);
		scene.add(this.outlineMesh);
    }

    forTilesInRegion(regionMin, regionMax, callback) {
		for (const tile of this.tileData) {
		    if (tile.coords.isWithin(regionMin, regionMax))
			callback(tile);
		}
    }
}

export class TileBlockAtlas {
    constructor(scene) {
		this.tileBlocks = new Map();
		this.scene = scene;
		
		this.tileGroup = new THREE.Group();
		this.outlineGroup = new THREE.Group();
		this.scene.add(this.tileGroup);
		this.scene.add(this.outlineGroup);

		this.numTiles = 0;
		this.history = [];

		const vertices = new Float32Array([
		    -0.515625, -0.515625, 0.0,
		     0.515625, -0.515625, 0.0,
		    -0.515625,  0.515625, 0.0,
		     0.515625,  0.515625, 0.0,
		    -0.515625,  0.515625, 0.0,
		     0.515625, -0.515625, 0.0,
		]);

		const uvs = new Float32Array([
		    0.0, 0.0,
		    1.0, 0.0,
		    0.0, 1.0,
		    1.0, 1.0,
		    0.0, 1.0,
		    1.0, 0.0,
		]);
		
		outlineGeometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
		outlineGeometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
		outlineGeometry.setAttribute("offset", new THREE.InstancedBufferAttribute(new Float32Array(BLOCK_SIZE*3), 3));
		outlineGeometry.setAttribute("strengths", new THREE.InstancedBufferAttribute(new Int32Array(BLOCK_SIZE*4), 4));
		outlineGeometry.attributes.offset.setUsage(THREE.DynamicDrawUsage);
		outlineGeometry.attributes.strengths.setUsage(THREE.DynamicDrawUsage);

		const outlineTexture = AssetManager.getTexture("outlines").clone();
		//outlineTexture.generateMipmaps = true;
		outlineTexture.magFilter = THREE.NearestFilter;
		//outlineTexture.minFilter = THREE.LinearMipmapLinearFilter;
		outlineTexture.minFilter = THREE.LinearFilter;
		outlineTexture.needsUpdate = true;

		/*
		const outlineTextures = [
		    AssetManager.getTexture("outline0"),
		    AssetManager.getTexture("outline1"),
		    AssetManager.getTexture("outline2"),
		];

		for (const tex of outlineTextures) {
		    tex.generateMipmaps = true;
		    tex.magFilter = THREE.NearestFilter;
		    tex.minFilter = THREE.LinearMipmapLinearFilter;
		}
		*/
		
		outlineMaterial.uniforms = {
		    map: { value: outlineTexture },
		    //tex0: { value: outlineTexture[0] },
		    //tex1: { value: outlineTexture[0] },
		    //tex2: { value: outlineTexture[0] },
		};
		outlineMaterial.vertexShader = AssetManager.getFile("outline_vs");
		outlineMaterial.fragmentShader = AssetManager.getFile("outline_fs");
		outlineMaterial.transparent = true;
    }

    clear() {
    	this.tileBlocks = new Map();
    	this.numTiles = 0;

    	// TODO: not entirely sure if geometry will be properly be deallocated
    	// if memory leaks appear after clearing, start looking into this
    	this.tileGroup.clear();
    	this.outlineGroup.clear();
    }

    stepBackward() {
    	const coords = this.history.pop();
    	return this.remove(coords);
    }

    add(type, coords) {
		const blockIndex = this.getBlockIndex(coords);

		if (!this.tileBlocks.has(blockIndex.y))
		    this.tileBlocks.set(blockIndex.y, new Map());

		const subMap = this.tileBlocks.get(blockIndex.y);
		if (!subMap.has(blockIndex.x)) {
		    const tileBlock = new TileBlock(blockIndex.mul(BLOCK_DIMS));

		    this.tileGroup.add(tileBlock.tileMesh);
		    this.outlineGroup.add(tileBlock.outlineMesh);
		    
		    subMap.set(blockIndex.x, tileBlock);
		}

		const tileBlock = subMap.get(blockIndex.x);

		tileBlock.add(type, coords);

		this.history.push(coords);
		this.numTiles++;
    }

    remove(coords) {
    	const blockIndex = this.getBlockIndex(coords);

		if (!this.tileBlocks.has(blockIndex.y))
			return false;

		const subMap = this.tileBlocks.get(blockIndex.y);
		if (!subMap.has(blockIndex.x))
			return false;

		const tileBlock = subMap.get(blockIndex.x);
		if (tileBlock.remove(coords))
			this.numTiles--;

		return true;
    }

    getBlockIndex(coords) {
		return coords.div(BLOCK_DIMS).floor();
    }

    forTilesInRegion(regionMin, regionMax, callback) {
		const minIndex = regionMin.div(BLOCK_DIMS).floor();
		const maxIndex = regionMax.div(BLOCK_DIMS).floor().add(new Vector2D(1, 1));

		for (let y = minIndex.y; y < maxIndex.y; y++) {
		    for (let x = minIndex.x; x < maxIndex.x; x++) {
				if (this.tileBlocks.has(y)) {
				    const submap = this.tileBlocks.get(y);
				    if (submap.has(x)) {
						const tileBlock = submap.get(x);
						tileBlock.forTilesInRegion(regionMin, regionMax, callback);
				    }
				}
		    }
		}
    }

    getAllTiles() {
    	const tiles = [];
    	
    	for (const submap of this.tileBlocks.values()) {
    		for (const tileBlock of submap.values()) {
				for (const tile of tileBlock.tileData) {
					tiles.push(tile);
				}
    		}
    	}

    	return tiles;
    }

    getTileAtLocation(coords) {
	    const blockIndex = this.getBlockIndex(coords);
	    if (this.tileBlocks.has(blockIndex.y)) {
	    	const subMap = this.tileBlocks.get(blockIndex.y);
	    	if (subMap.has(blockIndex.x)) {
	    		const block = subMap.get(blockIndex.x);
	    		return block.getTile(coords);
	    	}
	    }
	    return null;
    }

    setVisible(tilesVisible, outlinesVisible) {
    	this.tileGroup.visible = tilesVisible;
    	this.outlineGroup.visible = outlinesVisible;
    }
}
