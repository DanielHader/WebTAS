document.addEventListener('keydown', keydown);
document.addEventListener('keyup', keyup);

let keymap = {
    "KeyW": "up",
    "KeyS": "down",
    "KeyA": "left",
    "KeyD": "right",

    "ArrowUp": "up",
    "ArrowDown": "down",
    "ArrowLeft": "left",
    "ArrowRight": "right",

    "KeyP": "zoom_in",
    "KeyO": "zoom_out",
}

let keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    zoom_in: false,
    zoom_out: false,
}

let zoom_linear = 1;

const CAMERA_SPEED = 0.02;
const ZOOM_MIN = -1;
const ZOOM_MAX = 6;
const ZOOM_SPEED = 0.1;

function update() {
    if (keys.zoom_out) zoom_linear += ZOOM_SPEED;
    if (keys.zoom_in) zoom_linear -= ZOOM_SPEED;
    if (zoom_linear < ZOOM_MIN) zoom_linear = ZOOM_MIN;
    if (zoom_linear > ZOOM_MAX) zoom_linear = ZOOM_MAX;
	
    camera.zoom = Math.pow(2, -zoom_linear);

    if (keys.up) camera.position.y -= CAMERA_SPEED / camera.zoom;
    if (keys.down) camera.position.y += CAMERA_SPEED / camera.zoom;
    if (keys.left) camera.position.x += CAMERA_SPEED / camera.zoom;
    if (keys.right) camera.position.x -= CAMERA_SPEED / camera.zoom;

    camera.updateProjectionMatrix();
}

function keyup(event) {
    if (event.code in keymap) {
	keys[keymap[event.code]] = false;
    }
}

function keydown(event) {
    if (event.code in keymap) {
	keys[keymap[event.code]] = true;
    }
    
    if (event.code === "Space") {
	system.step();
    }
}

