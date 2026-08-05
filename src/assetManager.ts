import * as THREE from "three";
import * as Logger from "./logging.svelte.ts"

const textures = new Map<string, three.Texture>();
const files = new Map<string, string>();

const startupTextureList = {
    font: "assets/fonts/roboto/roboto_mtsdf.png",
    outlines: "assets/textures/outlines.png",
    no_tile: "assets/textures/no_tile.png",
};

const startupFileList = {
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

export function loadStartupAssets(onComplete: () => void) {
    const fileLoader = new THREE.FileLoader();
    const textureLoader = new THREE.TextureLoader();

    let assetCount = 0;
    
    THREE.DefaultLoadingManager.onLoad = () => {
        Logger.info(`loaded ${assetCount} assets on startup`);
        onComplete();
    }

    for (const [name, url] of Object.entries(startupTextureList)) {
	textureLoader.load(url, (texture) => {
	    textures[name] = texture;
	    assetCount++;
	});
    }

    for (const [name, url] of Object.entries(startupFileList)) {
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
