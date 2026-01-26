import * as THREE from './three.module.mjs';
import * as AssetManager from './assetmanager.mjs';
import { TextManager } from './textmanager.mjs';
import { Vector2D } from './utils.mjs';

export class SelectedTile {

	constructor(scene) {
		this.backgroundColor = 0xffffee;

		this.simulator = simulator;
		this.canvas = document.getElementById('tile-canvas');
		this.renderer = new THREE.WebGLRenderer({antialias: true, canvas: this.canvas});
		this.renderer.setPixelRatio(window.devicePixelRatio);

		this.scene = new THREE.Scene();
		this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 10);
		this.camera.position.z = 4;

		this.resizeObserver = new ResizeObserver((entries) => { this.resize(); });
		this.resizeObserver.observe(this.canvas);

		this.textManager = new TextManager(this.scene, this.canvas);
	}

	init() {
		this.textManager.init();

		const noTileTexture = AssetManager.getTexture('no_tile');

		const tileGeom = new THREE.PlaneGeometry(1, 1);
		const noTileMat = new THREE.MeshBasicMaterial({map: noTileTexture, transparent: true});
		this.noTileMesh = new THREE.Mesh(tileGeom, noTileMat);

		this.scene.add(this.noTileMesh);

		this.tileGroup = new THREE.Group();
		const tileMat = new THREE.MeshBasicMaterial();
		this.tileMesh = new THREE.Mesh(tileGeom, tileMat);
		this.tileGroup.add(this.tileMesh);

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

		const offset = new Float32Array([
			0.0, 0.0, 0.0,
			0.0, 0.0, 0.0,
			0.0, 0.0, 0.0,
			0.0, 0.0, 0.0,
			0.0, 0.0, 0.0,
			0.0, 0.0, 0.0,
		]);

		const strengths = new Int32Array([
			2, 2, 2, 2,
			2, 2, 2, 2,
			2, 2, 2, 2,
			2, 2, 2, 2,
			2, 2, 2, 2,
			2, 2, 2, 2,
		]);

		const outlineGeometry = new THREE.BufferGeometry();
		outlineGeometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
		outlineGeometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
		outlineGeometry.setAttribute("offset", new THREE.BufferAttribute(offset, 3));
		outlineGeometry.setAttribute("strengths", new THREE.BufferAttribute(strengths, 4));

		const outlineTexture = AssetManager.getTexture("outlines").clone();
		outlineTexture.magFilter = THREE.NearestFilter;
		outlineTexture.minFilter = THREE.LinearFilter;
		outlineTexture.needsUpdate = true;

		const outlineMaterial = new THREE.ShaderMaterial();
		outlineMaterial.uniforms = {
		    map: { value: outlineTexture },
		};
		outlineMaterial.vertexShader = AssetManager.getFile("outline_vs");
		outlineMaterial.fragmentShader = AssetManager.getFile("outline_fs");
		outlineMaterial.transparent = true;

		this.outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
		this.tileGroup.add(this.outlineMesh);
		
		this.tileGroup.visible = false;
		this.scene.add(this.tileGroup);
	}

	selectTile(tileType) {
		if (!tileType) {
			this.noTileMesh.visible = true;
			this.tileGroup.visible = false;

			this.textManager.clearText();
		} else {
			this.tileMesh.material.color = new THREE.Color(tileType.color.getHexString());
			const strengthsAttrib = this.outlineMesh.geometry.attributes.strengths.array;

			const dirs = ['north', 'east', 'south', 'west'];
			for (let i = 0; i < dirs.length; i++) {
				const dir = dirs[i];
				if (tileType.glues[dir]) {
					for (let j = 0; j < 6; j++) strengthsAttrib[i + 4*j] = tileType.glues[dir].strength;
				} else {
					for (let j = 0; j < 6; j++) strengthsAttrib[i + 4*j] = 0;
				}
				
			}
			this.outlineMesh.geometry.attributes.strengths.needsUpdate = true;

			this.noTileMesh.visible = false;
			this.tileGroup.visible = true;

			this.textManager.clearText();
			this.textManager.genTileTypeGlyphs(tileType);
			this.textManager.addTileGlyphs({coords: new Vector2D(0, 0), type: tileType});
		}
	}

	resize() {
		const rect = this.canvas.getBoundingClientRect();
    	const width = rect.width;
    	const height = rect.height;

		this.renderer.setSize(width, height, false);

		const aspect = width / height;

		if (width >= height) {
			this.camera.left = -aspect;
			this.camera.right = aspect;
			this.camera.top = 1;
			this.camera.bottom = -1;
		} else {
			this.camera.left = -1;
			this.camera.right = 1;
			this.camera.top = 1 / aspect;
			this.camera.bottom = -1 / aspect;
		}
		
		this.camera.updateProjectionMatrix();

		this.renderUpdate = true;
	}

	render() {
		this.renderer.setClearColor(this.backgroundColor);
		this.textManager.update();
		this.renderer.render(this.scene, this.camera);
	}
}