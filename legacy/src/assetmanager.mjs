import * as THREE from './three.module.mjs';

import { Logger } from './logger.mjs';

const textureList = {
    //font: "assets/fonts/OpenSansCondensed-Light/mtsdf.png",
    font: "assets/fonts/roboto/roboto_mtsdf.png",
    outlines: "assets/textures/outlines.png",
    //outline0: "assets/textures/outline0.png",
    //outline1: "assets/textures/outline1.png",
    //outline2: "assets/textures/outline2.png",

    no_tile: "assets/textures/no_tile.png",
    //selected_tile_label: "assets/textures/selected_tile_label.png",
};

const fileList = {
    font_data: "assets/fonts/roboto/roboto_mtsdf.json",
    text_vs: "assets/shaders/text.vert",
    text_fs: "assets/shaders/text.frag",
    outline_vs: "assets/shaders/outline.vert",
    outline_fs: "assets/shaders/outline.frag",

    sierpinski_tds: "assets/examples/SierpinskiTriangle.tds",
    sierpinski_tdp: "assets/examples/SierpinskiTriangle.tdp",
    counter_tds: "assets/examples/logwidth_binary_counter.tds",
    counter_tdp: "assets/examples/logwidth_binary_counter.tdp",
    square6x6_tds: "assets/examples/6x6_square.tds",
    square6x6_tdp: "assets/examples/6x6_square.tdp",
    turing_machine_tds: "assets/examples/turing_machine.tds",
    turing_machine_tdp: "assets/examples/turing_machine.tdp",
    
    tile_properties_html: "assets/html/tile_properties.html",
};

let assetCount = 0;

const textures = {};
const files = {};

export function loadAssets(callback) {
    const fileLoader = new THREE.FileLoader();
    const textureLoader = new THREE.TextureLoader();

    THREE.DefaultLoadingManager.onLoad = () => {
	Logger.log(Logger.INFO, `loaded ${assetCount} assets during initialization`);
	callback();
    };

    for (const [name, url] of Object.entries(textureList)) {
	textureLoader.load(url, (texture) => {
	    textures[name] = texture;
	    assetCount++;
	});
    }

    for (const [name, url] of Object.entries(fileList)) {
	fileLoader.load(url, (data) => {
	    files[name] = data;
	    assetCount++;
	});
    }
}

export function getTexture(name) {
    return textures[name];
}

export function getFile(name) {
    return files[name];
}


