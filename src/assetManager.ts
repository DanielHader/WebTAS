import * as THREE from "three";
import * as Logger from "./logging.svelte.ts"

const textures = new Map<string, three.Texture>();
const files = new Map<string, string>();

const startupTextureList = {
    font: "src/assets/fonts/roboto/roboto_mtsdf.png",
    outlines: "src/assets/textures/outlines.png",
    no_tile: "src/assets/textures/no_tile.png",
};

const startupFileList = {
    font_data: "src/assets/fonts/roboto/roboto_mtsdf.json",
    text_vs: "src/assets/shaders/text.vert",
    text_fs: "src/assets/shaders/text.frag",
    outline_vs: "src/assets/shaders/outline.vert",
    outline_fs: "src/assets/shaders/outline.frag",

    sierpinski_tds: "src/assets/examples/SierpinskiTriangle.tds",
    sierpinski_tdp: "src/assets/examples/SierpinskiTriangle.tdp",
    counter_tds: "src/assets/examples/logwidth_binary_counter.tds",
    counter_tdp: "src/assets/examples/logwidth_binary_counter.tdp",
    square6x6_tds: "src/assets/examples/6x6_square.tds",
    square6x6_tdp: "src/assets/examples/6x6_square.tdp",
    turing_machine_tds: "src/assets/examples/turing_machine.tds",
    turing_machine_tdp: "src/assets/examples/turing_machine.tdp",
    
    tile_properties_html: "src/assets/html/tile_properties.html",
};

export function loadStartupAssets(onComplete: () => void) {
    const fileLoader = new THREE.FileLoader();
    const textureLoader = new THREE.TextureLoader();

    let assetCount = 0;

    let promises = [];

    for (const [name, url] of Object.entries(startupTextureList)) {
	let promise = textureLoader.loadAsync(url)
            .then((texture) => {
                textures[name] = texture;
	        assetCount++;
            }).catch((err) => {
                Logger.error(`unable to load texture: ${url}`);
            });
        promises.push(promise);
    }

    for (const [name, url] of Object.entries(startupFileList)) {
        let promise = fileLoader.loadAsync(url)
            .then((file) => {
                files[name] = file;
	        assetCount++;
            }).catch((err) => {
                Logger.error(`unable to load file: ${url}`);
            });
        promises.push(promise);
    }

    Promise.all(promises).then(() => {
        Logger.info(`loaded ${assetCount} assets on startup`);
        onComplete();
    });
}

export function getTexture(name) {
    return textures[name];
}

export function getFile(name) {
    return files[name];
}
