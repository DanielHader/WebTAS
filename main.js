const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 10);
const renderer = new THREE.WebGLRenderer();

document.getElementById("simulator").appendChild(renderer.domElement);
window.addEventListener('resize', resize, false);

const tile_types = [
    new TileType("seed", "seed", "#aaaaff", {
	north: new Glue(2, "A"),
	east: new Glue(2, "B")}),

    new TileType("Vertical", "V", "#ffaaff", {
	north: new Glue(2, "A"),
	east: new Glue(1, '1'),
	south: new Glue(2, "A")}),

    new TileType("Horizontal", "H", "#aaffff", {
	north: new Glue(1, '0'),
	east: new Glue(2, "B"),
	west: new Glue(2, "B")}),

    new TileType("Add 00", "0", "#cccccc", {
	north: new Glue(1, "0"),
	east: new Glue(1, "0"),
	south: new Glue(1, "0"),
	west: new Glue(1, "0")}),

    new TileType("Add 01", "1", "#666666", {
	north: new Glue(1, "1"),
	east: new Glue(1, "0"),
	south: new Glue(1, "0"),
	west: new Glue(1, "1")}),

    new TileType("Add 10", "1", "#666666", {
	north: new Glue(1, "1"),
	east: new Glue(1, "0"),
	south: new Glue(1, "1"),
	west: new Glue(1, "0")}),

    new TileType("Add 11", "0", "#cccccc", {
	north: new Glue(1, "0"),
	east: new Glue(1, "1"),
	south: new Glue(1, "1"),
	west: new Glue(1, "1")}),
];

system = new System(2, tile_types);

camera.position.set(0, 0, 2);
camera.updateProjectionMatrix();

renderer.setClearColor(0xffffaa, 1);

resize();
animate();

function resize() {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -aspect;
    camera.right = aspect;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

const NO_MENU = 0;
const FILE_MENU = 1;
const VIEW_MENU = 2;
const SETTINGS_MENU = 3;

let open_menu = NO_MENU;

function dropdown(content_div) {
    let open = false;
    
    function click() {
	if (open) {
	    content_div.className = content_div.className.replace(" w3-show", "");
	    open = false;
	} else {
	    content_div.className += " w3-show";
	    open = true;
	}
    }
    
    return click;
}

