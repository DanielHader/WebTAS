import * as THREE from './three.module.mjs';
import * as AssetManager from './assetmanager.mjs';
import { Color, Vector2D } from './utils.mjs';

const glyphTable = new Map();
const tileGlyphData = new Map();

const BUCKET_SIZE = 1024;
const glyphBuckets = [];
let glyphCount = 0;
let newGlyphBuckets = 0;

let glyphGeometry, glyphMaterial;

const vertices = new Float32Array([
    0.0, 0.0, 0.0,
    1.0, 0.0, 0.0,
    0.0, 1.0, 0.0,
    1.0, 1.0, 0.0,
    0.0, 1.0, 0.0,
    1.0, 0.0, 0.0,
]);

const uvs = new Float32Array([
    0.0, 0.0,
    1.0, 0.0,
    0.0, 1.0,
    1.0, 1.0,
    0.0, 1.0,
    1.0, 0.0,
]);

export function clearText() {
    glyphCount = 0;
    for (const bucket of glyphBuckets) {
	bucket.geometry.instanceCount = 0;
    }
}

export function addTileGlyphs(tile) {
    const glyphData = tileGlyphData.get(tile.type.id);

    const offset = [tile.coords.x, tile.coords.y];
    
    let addedGlyphs = 0;
    let bucketIdx = Math.floor(glyphCount / BUCKET_SIZE);

    let subarray;
    while (addedGlyphs < glyphData.length) {
	const bucket = glyphBuckets[bucketIdx];
	
	const start = glyphCount % BUCKET_SIZE;
	const capacity = BUCKET_SIZE - start;
	const count = Math.min(capacity, glyphData.length - addedGlyphs);

	const attributes = bucket.geometry.attributes;

	subarray = glyphData.atlasOffsetArray.subarray(2*addedGlyphs, 2*(addedGlyphs + count));
	attributes.atlasOffset.array.set(subarray, 2*start);

	subarray = glyphData.atlasSizeArray.subarray(2*addedGlyphs, 2*(addedGlyphs + count));
	attributes.atlasSize.array.set(subarray, 2*start);

	subarray = glyphData.glyphOriginArray.subarray(2*addedGlyphs, 2*(addedGlyphs + count));
	attributes.glyphOrigin.array.set(subarray, 2*start);

	subarray = glyphData.glyphUpArray.subarray(2*addedGlyphs, 2*(addedGlyphs + count));
	attributes.glyphUp.array.set(subarray, 2*start);

	subarray = glyphData.glyphRightArray.subarray(2*addedGlyphs, 2*(addedGlyphs + count));
	attributes.glyphRight.array.set(subarray, 2*start);

	subarray = glyphData.glyphSizeArray.subarray(addedGlyphs, addedGlyphs + count);
	attributes.glyphSize.array.set(subarray, start);

	subarray = glyphData.glyphColorArray.subarray(3*addedGlyphs, 3*(addedGlyphs + count));
	attributes.glyphColor.array.set(subarray, 3*start);

	for (let i = 0; i < count; i++)
	    attributes.glyphOffset.array.set(offset, 2*(start + i));
	
	addedGlyphs += count;
	glyphCount += count;
	bucket.geometry.instanceCount += count;
	
	if (count === capacity) {
	    bucketIdx++;

	    if (bucketIdx === glyphBuckets.length) {
		const newBucket = new THREE.Mesh(glyphGeometry.clone(), glyphMaterial);
		newBucket.layers.enable(0);
		newBucket.layers.enable(1);
		newBucket.geometry.instanceCount = 0;
		newBucket.frustumCulled = false;
		glyphBuckets.push(newBucket);
		newGlyphBuckets++;
	    }
	}
    }
}

export function update(scene, canvas) {
    if (glyphMaterial === undefined)
	return;
    
    glyphMaterial.uniforms.viewport.value = new THREE.Vector2(canvas.clientWidth, canvas.clientHeight);

    for (let i = 0; i < newGlyphBuckets; i++) {
	const bucket = glyphBuckets[glyphBuckets.length - i - 1];
	scene.add(bucket);
    }
    
    const nonempty = Math.ceil(glyphCount / BUCKET_SIZE);
    for (let i = 0; i < nonempty; i++) {
	const bucket = glyphBuckets[i];

	bucket.geometry.attributes.atlasOffset.needsUpdate = true;
	bucket.geometry.attributes.atlasSize.needsUpdate = true;
	bucket.geometry.attributes.glyphOrigin.needsUpdate = true;
	bucket.geometry.attributes.glyphUp.needsUpdate = true;
	bucket.geometry.attributes.glyphRight.needsUpdate = true;
	bucket.geometry.attributes.glyphSize.needsUpdate = true;
	bucket.geometry.attributes.glyphColor.needsUpdate = true;
	bucket.geometry.attributes.glyphOffset.needsUpdate = true;
    }
}

export function init(scene, canvas) {
    initGlyphTable();

    glyphGeometry = new THREE.InstancedBufferGeometry();
    glyphGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    glyphGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    
    glyphGeometry.setAttribute('atlasOffset', new THREE.InstancedBufferAttribute(new Float32Array(BUCKET_SIZE * 2), 2));
    glyphGeometry.setAttribute('atlasSize',   new THREE.InstancedBufferAttribute(new Float32Array(BUCKET_SIZE * 2), 2));
    glyphGeometry.setAttribute('glyphOrigin', new THREE.InstancedBufferAttribute(new Float32Array(BUCKET_SIZE * 2), 2));
    glyphGeometry.setAttribute('glyphOffset', new THREE.InstancedBufferAttribute(new Float32Array(BUCKET_SIZE * 2), 2));
    glyphGeometry.setAttribute('glyphUp',     new THREE.InstancedBufferAttribute(new Float32Array(BUCKET_SIZE * 2), 2));
    glyphGeometry.setAttribute('glyphRight',  new THREE.InstancedBufferAttribute(new Float32Array(BUCKET_SIZE * 2), 2));
    glyphGeometry.setAttribute('glyphSize',   new THREE.InstancedBufferAttribute(new Float32Array(BUCKET_SIZE * 1), 1));
    glyphGeometry.setAttribute('glyphColor',  new THREE.InstancedBufferAttribute(new Float32Array(BUCKET_SIZE * 3), 3));
    glyphGeometry.instanceCount = 0;

    const fontTexture = AssetManager.getTexture("font");
    fontTexture.minFilter = THREE.LinearFilter;
    fontTexture.magFilter = THREE.LinearFilter;
    fontTexture.generateMipmaps = true;
    fontTexture.needsUpdate = true;

    const fontData = JSON.parse(AssetManager.getFile("font_data"));
    
    glyphMaterial = new THREE.ShaderMaterial({
	uniforms: {
	    viewport: { value: new THREE.Vector2(canvas.clientWidth, canvas.clientHeight) },
	    fieldRange: { value: fontData.atlas.distanceRange / fontData.atlas.size },
	    map: { type: "t", value: fontTexture }
	    
	},
	vertexShader: AssetManager.getFile("text_vs"),
	fragmentShader: AssetManager.getFile("text_fs"),
	transparent: true,
    });

    const glyphMesh = new THREE.Mesh(glyphGeometry, glyphMaterial);
    glyphMesh.layers.enable(0);
    glyphMesh.layers.enable(1);
    glyphMesh.frustumCulled = false;
    glyphBuckets.push(glyphMesh);
    newGlyphBuckets = 1;
}

function initGlyphTable() {
    const fontData = JSON.parse(AssetManager.getFile("font_data"));

    const atlas = fontData.atlas;

    for (const glyph of fontData.glyphs) {
	const char = String.fromCharCode(glyph.unicode);

	if (char === ' ') {
	    glyphTable.set(char, { advance: glyph.advance });
	} else {
	    const atlasOffset = new Vector2D(
		glyph.atlasBounds.left / atlas.width,
		glyph.atlasBounds.bottom / atlas.height
	    );

	    const atlasSize = new Vector2D(
		(glyph.atlasBounds.right - glyph.atlasBounds.left) / atlas.width,
		(glyph.atlasBounds.top - glyph.atlasBounds.bottom) / atlas.height
	    );
	    const planeOffset = new Vector2D(
		glyph.planeBounds.left,
		glyph.planeBounds.bottom
	    );
	    const planeSize = new Vector2D(
		glyph.planeBounds.right - glyph.planeBounds.left,
		glyph.planeBounds.top - glyph.planeBounds.bottom
	    );
	    
	    glyphTable.set(char, {
		atlasOffset: atlasOffset,
		atlasSize: atlasSize,
		planeOffset: planeOffset,
		planeSize: planeSize,
		advance: glyph.advance,
	    });
	}
    }
}

const NAME_SIZE = 0.12;
const NAME_CENTER = new Vector2D(0, -0.125);

const LABEL_SIZE = 0.15;
const LABEL_CENTER = new Vector2D(0, 0.0625);

const GLUE_SIZE = 0.125;
const N_CENTER = new Vector2D(0, 0.375);
const E_CENTER = new Vector2D(0.375, 0);
const S_CENTER = new Vector2D(0, -0.375);
const W_CENTER = new Vector2D(-0.375, 0);

export function genTileTypeGlyphs(type) {

    const textColor = type.color.getContrastColor();

    const data = [];
    
    data.push(genGlyphsFromText(type.name, textColor, NAME_SIZE, NAME_CENTER));
    data.push(genGlyphsFromText(type.label, textColor, LABEL_SIZE, LABEL_CENTER));

    if (type.glues.north !== null)
	data.push(genGlyphsFromText(type.glues.north.label, textColor, GLUE_SIZE, N_CENTER, Math.PI));
    if (type.glues.east !== null)
	data.push(genGlyphsFromText(type.glues.east.label, textColor, GLUE_SIZE, E_CENTER, -Math.PI / 2));
    if (type.glues.south !== null)
	data.push(genGlyphsFromText(type.glues.south.label, textColor, GLUE_SIZE, S_CENTER, 0));
    if (type.glues.west !== null)
	data.push(genGlyphsFromText(type.glues.west.label, textColor, GLUE_SIZE, W_CENTER, Math.PI / 2));
    
    tileGlyphData.set(type.id, concatGlyphData(data));
}

function concatGlyphData(dataList) {
    const data = { length: 0 };

    for (const dataItem of dataList)
	data.length += dataItem.length;

    data.atlasOffsetArray = new Float32Array(data.length * 2);
    data.atlasSizeArray   = new Float32Array(data.length * 2);
    data.glyphOriginArray = new Float32Array(data.length * 2);
    data.glyphUpArray     = new Float32Array(data.length * 2);
    data.glyphRightArray  = new Float32Array(data.length * 2);
    data.glyphSizeArray   = new Float32Array(data.length * 1);
    data.glyphColorArray  = new Float32Array(data.length * 3);

    let offset = 0;
    for (let i = 0; i < dataList.length; i++) {
	const dataItem = dataList[i];
	data.atlasOffsetArray.set(dataItem.atlasOffsetArray, offset * 2);
	data.atlasSizeArray.set(dataItem.atlasSizeArray, offset * 2);
	data.glyphOriginArray.set(dataItem.glyphOriginArray, offset * 2);
	data.glyphUpArray.set(dataItem.glyphUpArray, offset * 2);
	data.glyphRightArray.set(dataItem.glyphRightArray, offset * 2);
	data.glyphSizeArray.set(dataItem.glyphSizeArray, offset);
	data.glyphColorArray.set(dataItem.glyphColorArray, offset * 3);

	offset += dataItem.length;
    }

    return data;
}

// angle is the clockwise rotation in radians, 0 means normal left-to-right
// center is a Vector2D representing the center location of the text
function genGlyphsFromText(text, color, size, center, angle=0, maxWidth=Infinity) {

    const up = new Vector2D(0, 1).rotateCW(angle);
    const right = new Vector2D(1, 0).rotateCW(angle);
    
    // determine length of text
    let width = 0;
    let length = text.length;
    for (let i = 0; i < text.length; i++) {
	const char = text[i];
	const glyph = glyphTable.get(char);
	width += glyph.advance * size;
    }
    // TODO handle maxWidth here

    // generate arrays for text
    const data = {
	length: length,
	atlasOffsetArray: new Float32Array(length * 2),
	atlasSizeArray:   new Float32Array(length * 2),
	glyphOriginArray: new Float32Array(length * 2),
	glyphUpArray:     new Float32Array(length * 2),
	glyphRightArray:  new Float32Array(length * 2),
	glyphSizeArray:   new Float32Array(length * 1),
	glyphColorArray:  new Float32Array(length * 3),
    };
    
    let advance = 0;
    for (let i = 0; i < length; i++) {
	const char = text[i];
	const glyph = glyphTable.get(char);

	const poffs = glyph.planeOffset.scale(size);
	const psize = glyph.planeSize.scale(size);
	const origin = center.add(right.scale(advance - width / 2)).add(poffs.rotateCW(angle));
	
	data.atlasOffsetArray.set(glyph.atlasOffset.toArray(), 2*i);
	data.atlasSizeArray.set(glyph.atlasSize.toArray(), 2*i);
	data.glyphOriginArray.set(origin.toArray(), 2*i);
	data.glyphUpArray.set(up.scale(psize.y).toArray(), 2*i);
	data.glyphRightArray.set(right.scale(psize.x).toArray(), 2*i);
	data.glyphSizeArray.set([size], i);
	data.glyphColorArray.set(color.toArray(), 3*i);

	advance += glyph.advance * size;
    }

    return data;
}

export class TextManager {

    static BUCKET_SIZE = 1024;

    constructor(scene, canvas) {
	this.scene = scene;
	this.canvas = canvas;

	this.glyphGeometry = undefined;
	this.glyphMaterial = undefined;

	// stores attributes related to each glyph
	this.glyphTable = new Map();

	// stores glyphs for each tile
	this.tileGlyphData = new Map();

	this.glyphBuckets = [];

	this.glyphCount = 0;
	this.newGlyphBuckets = 0;
    }

    init() {
	initGlyphTable();

	this.glyphGeometry = new THREE.InstancedBufferGeometry();
	this.glyphGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
	this.glyphGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
	
	this.glyphGeometry.setAttribute('atlasOffset', new THREE.InstancedBufferAttribute(new Float32Array(BUCKET_SIZE * 2), 2));
	this.glyphGeometry.setAttribute('atlasSize',   new THREE.InstancedBufferAttribute(new Float32Array(BUCKET_SIZE * 2), 2));
	this.glyphGeometry.setAttribute('glyphOrigin', new THREE.InstancedBufferAttribute(new Float32Array(BUCKET_SIZE * 2), 2));
	this.glyphGeometry.setAttribute('glyphOffset', new THREE.InstancedBufferAttribute(new Float32Array(BUCKET_SIZE * 2), 2));
	this.glyphGeometry.setAttribute('glyphUp',     new THREE.InstancedBufferAttribute(new Float32Array(BUCKET_SIZE * 2), 2));
	this.glyphGeometry.setAttribute('glyphRight',  new THREE.InstancedBufferAttribute(new Float32Array(BUCKET_SIZE * 2), 2));
	this.glyphGeometry.setAttribute('glyphSize',   new THREE.InstancedBufferAttribute(new Float32Array(BUCKET_SIZE * 1), 1));
	this.glyphGeometry.setAttribute('glyphColor',  new THREE.InstancedBufferAttribute(new Float32Array(BUCKET_SIZE * 3), 3));
	this.glyphGeometry.instanceCount = 0;

	const fontTexture = AssetManager.getTexture("font").clone();
	fontTexture.minFilter = THREE.LinearFilter;
	fontTexture.magFilter = THREE.LinearFilter;
	fontTexture.generateMipmaps = true;
	fontTexture.needsUpdate = true;

	const fontData = JSON.parse(AssetManager.getFile("font_data"));
	
	this.glyphMaterial = new THREE.ShaderMaterial({
	    uniforms: {
		viewport: { value: new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight) },
		fieldRange: { value: fontData.atlas.distanceRange / fontData.atlas.size },
		map: { type: "t", value: fontTexture }
		
	    },
	    vertexShader: AssetManager.getFile("text_vs"),
	    fragmentShader: AssetManager.getFile("text_fs"),
	    transparent: true,
	});

	const glyphMesh = new THREE.Mesh(this.glyphGeometry, this.glyphMaterial);
	glyphMesh.layers.enable(0);
	glyphMesh.layers.enable(1);
	glyphMesh.frustumCulled = false;
	// glyphMesh.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
	// 	material.uniforms.viewport.value = new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight);
	// };
	this.glyphBuckets.push(glyphMesh);
	this.newGlyphBuckets = 1;
    }

    clearText() {
	this.glyphCount = 0;
	for (const bucket of this.glyphBuckets) {
	    bucket.geometry.instanceCount = 0;
	}
    }

    addTileGlyphs(tile) {
	const glyphData = this.tileGlyphData.get(tile.type.id);

	const offset = [tile.coords.x, tile.coords.y];
	
	let addedGlyphs = 0;
	let bucketIdx = Math.floor(this.glyphCount / TextManager.BUCKET_SIZE);

	let subarray;
	while (addedGlyphs < glyphData.length) {
	    const bucket = this.glyphBuckets[bucketIdx];
	    
	    const start = this.glyphCount % TextManager.BUCKET_SIZE;
	    const capacity = TextManager.BUCKET_SIZE - start;
	    const count = Math.min(capacity, glyphData.length - addedGlyphs);

	    const attributes = bucket.geometry.attributes;

	    subarray = glyphData.atlasOffsetArray.subarray(2*addedGlyphs, 2*(addedGlyphs + count));
	    attributes.atlasOffset.array.set(subarray, 2*start);

	    subarray = glyphData.atlasSizeArray.subarray(2*addedGlyphs, 2*(addedGlyphs + count));
	    attributes.atlasSize.array.set(subarray, 2*start);

	    subarray = glyphData.glyphOriginArray.subarray(2*addedGlyphs, 2*(addedGlyphs + count));
	    attributes.glyphOrigin.array.set(subarray, 2*start);

	    subarray = glyphData.glyphUpArray.subarray(2*addedGlyphs, 2*(addedGlyphs + count));
	    attributes.glyphUp.array.set(subarray, 2*start);

	    subarray = glyphData.glyphRightArray.subarray(2*addedGlyphs, 2*(addedGlyphs + count));
	    attributes.glyphRight.array.set(subarray, 2*start);

	    subarray = glyphData.glyphSizeArray.subarray(addedGlyphs, addedGlyphs + count);
	    attributes.glyphSize.array.set(subarray, start);

	    subarray = glyphData.glyphColorArray.subarray(3*addedGlyphs, 3*(addedGlyphs + count));
	    attributes.glyphColor.array.set(subarray, 3*start);

	    for (let i = 0; i < count; i++)
		attributes.glyphOffset.array.set(offset, 2*(start + i));
	    
	    addedGlyphs += count;
	    this.glyphCount += count;
	    bucket.geometry.instanceCount += count;
	    
	    if (count === capacity) {
		bucketIdx++;

		if (bucketIdx === this.glyphBuckets.length) {
		    const newBucket = new THREE.Mesh(this.glyphGeometry.clone(), this.glyphMaterial);
		    // newBucket.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
	    	    // 	material.uniforms.viewport.value = new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight);
	    	    // };
		    newBucket.geometry.instanceCount = 0;
		    newBucket.frustumCulled = false;
		    this.glyphBuckets.push(newBucket);
		    this.newGlyphBuckets++;
		}
	    }
	}
    }

    update() {
	if (this.glyphMaterial === undefined)
	    return;
	
	this.glyphMaterial.uniforms.viewport.value = new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight);

	for (let i = 0; i < this.newGlyphBuckets; i++) {
	    const bucket = this.glyphBuckets[this.glyphBuckets.length - i - 1];
	    this.scene.add(bucket);
	}
	
	const nonempty = Math.ceil(this.glyphCount / TextManager.BUCKET_SIZE);
	for (let i = 0; i < nonempty; i++) {
	    const bucket = this.glyphBuckets[i];

	    bucket.geometry.attributes.atlasOffset.needsUpdate = true;
	    bucket.geometry.attributes.atlasSize.needsUpdate = true;
	    bucket.geometry.attributes.glyphOrigin.needsUpdate = true;
	    bucket.geometry.attributes.glyphUp.needsUpdate = true;
	    bucket.geometry.attributes.glyphRight.needsUpdate = true;
	    bucket.geometry.attributes.glyphSize.needsUpdate = true;
	    bucket.geometry.attributes.glyphColor.needsUpdate = true;
	    bucket.geometry.attributes.glyphOffset.needsUpdate = true;
	}
    }

    initGlyphTable() {
	const fontData = JSON.parse(AssetManager.getFile("font_data"));
	const atlas = fontData.atlas;

	for (const glyph of fontData.glyphs) {
	    const char = String.fromCharCode(glyph.unicode);

	    if (char === ' ') {
		this.glyphTable.set(char, { advance: glyph.advance });
	    } else {
		const atlasOffset = new Vector2D(
		    glyph.atlasBounds.left / atlas.width,
		    glyph.atlasBounds.bottom / atlas.height
		);
		const atlasSize = new Vector2D(
		    (glyph.atlasBounds.right - glyph.atlasBounds.left) / atlas.width,
		    (glyph.atlasBounds.top - glyph.atlasBounds.bottom) / atlas.height
		);
		const planeOffset = new Vector2D(
		    glyph.planeBounds.left,
		    glyph.planeBounds.bottom
		);
		const planeSize = new Vector2D(
		    glyph.planeBounds.right - glyph.planeBounds.left,
		    glyph.planeBounds.top - glyph.planeBounds.bottom
		);
		
		this.glyphTable.set(char, {
		    atlasOffset: atlasOffset,
		    atlasSize: atlasSize,
		    planeOffset: planeOffset,
		    planeSize: planeSize,
		    advance: glyph.advance,
		});
	    }
	}
    }

    genTileTypeGlyphs(type) {
	const textColor = type.color.getContrastColor();

	const data = [];
	
	data.push(this.genGlyphsFromText(type.name, textColor, NAME_SIZE, NAME_CENTER));
	data.push(this.genGlyphsFromText(type.label, textColor, LABEL_SIZE, LABEL_CENTER));

	if (type.glues.north !== null)
	    data.push(this.genGlyphsFromText(type.glues.north.label, textColor, GLUE_SIZE, N_CENTER, Math.PI));
	if (type.glues.east !== null)
	    data.push(this.genGlyphsFromText(type.glues.east.label, textColor, GLUE_SIZE, E_CENTER, -Math.PI / 2));
	if (type.glues.south !== null)
	    data.push(this.genGlyphsFromText(type.glues.south.label, textColor, GLUE_SIZE, S_CENTER, 0));
	if (type.glues.west !== null)
	    data.push(this.genGlyphsFromText(type.glues.west.label, textColor, GLUE_SIZE, W_CENTER, Math.PI / 2));
	
	this.tileGlyphData.set(type.id, this.concatGlyphData(data));
    }

    concatGlyphData(dataList) {
	const data = { length: 0 };

	for (const dataItem of dataList)
	    data.length += dataItem.length;

	data.atlasOffsetArray = new Float32Array(data.length * 2);
	data.atlasSizeArray   = new Float32Array(data.length * 2);
	data.glyphOriginArray = new Float32Array(data.length * 2);
	data.glyphUpArray     = new Float32Array(data.length * 2);
	data.glyphRightArray  = new Float32Array(data.length * 2);
	data.glyphSizeArray   = new Float32Array(data.length * 1);
	data.glyphColorArray  = new Float32Array(data.length * 3);

	let offset = 0;
	for (let i = 0; i < dataList.length; i++) {
	    const dataItem = dataList[i];
	    data.atlasOffsetArray.set(dataItem.atlasOffsetArray, offset * 2);
	    data.atlasSizeArray.set(dataItem.atlasSizeArray, offset * 2);
	    data.glyphOriginArray.set(dataItem.glyphOriginArray, offset * 2);
	    data.glyphUpArray.set(dataItem.glyphUpArray, offset * 2);
	    data.glyphRightArray.set(dataItem.glyphRightArray, offset * 2);
	    data.glyphSizeArray.set(dataItem.glyphSizeArray, offset);
	    data.glyphColorArray.set(dataItem.glyphColorArray, offset * 3);

	    offset += dataItem.length;
	}

	return data;
    }

    genGlyphsFromText(text, color, size, center, angle=0, maxWidth=Infinity) {
	const up = new Vector2D(0, 1).rotateCW(angle);
	const right = new Vector2D(1, 0).rotateCW(angle);
	
	// determine length of text
	let width = 0;
	let length = text.length;
	for (let i = 0; i < text.length; i++) {
	    const char = text[i];
	    const glyph = glyphTable.get(char);
	    width += glyph.advance * size;
	}
	// TODO handle maxWidth here

	// generate arrays for text
	const data = {
	    length: length,
	    atlasOffsetArray: new Float32Array(length * 2),
	    atlasSizeArray:   new Float32Array(length * 2),
	    glyphOriginArray: new Float32Array(length * 2),
	    glyphUpArray:     new Float32Array(length * 2),
	    glyphRightArray:  new Float32Array(length * 2),
	    glyphSizeArray:   new Float32Array(length * 1),
	    glyphColorArray:  new Float32Array(length * 3),
	};
	
	let indexOffset = 0; // keep track of spaces
	let advance = 0;
	for (let i = 0; i < length; i++) {
	    const char = text[i];
	    const glyph = glyphTable.get(char);

	    if (char === ' ') {
		indexOffset++;
	    } else {
		const idx = i - indexOffset;

		const poffs = glyph.planeOffset.scale(size);
		const psize = glyph.planeSize.scale(size);
		const origin = center.add(right.scale(advance - width / 2)).add(poffs.rotateCW(angle));
		
	        data.atlasOffsetArray.set(glyph.atlasOffset.toArray(), 2*idx);
	        data.atlasSizeArray.set(glyph.atlasSize.toArray(), 2*idx);
	        data.glyphOriginArray.set(origin.toArray(), 2*idx);
	        data.glyphUpArray.set(up.scale(psize.y).toArray(), 2*idx);
	        data.glyphRightArray.set(right.scale(psize.x).toArray(), 2*idx);
	        data.glyphSizeArray.set([size], idx);
	        data.glyphColorArray.set(color.toArray(), 3*idx);
            }
            advance += glyph.advance * size;
        }

        return data;
    }
}
