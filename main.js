const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 10);
const renderer = new THREE.WebGLRenderer();

document.body.appendChild(renderer.domElement);
window.addEventListener('resize', resize, false);

const tile_types = [
    new TileType("seed", "seed", "#ffffaa", {
	north: new Glue(2, "A"),
	east: new Glue(2, "B")}),

    new TileType("Vertical", "V", "#ffaaff", {
	south: new Glue(2, "A")}),
];

system = new System(2, tile_types);
system.step();

camera.position.z = 2;
camera.zoom = 0.5;
camera.updateProjectionMatrix();

renderer.setClearColor(0x666666, 1);

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

