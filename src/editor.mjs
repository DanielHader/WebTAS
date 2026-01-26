import * as AssetManager from './assetmanager.mjs';
import { Logger } from './logger.mjs';
import { parseColor } from './utils.mjs';

const UPDATE_SEED_MESSAGE = 'Warning, updating this tile will clear the simulation assembly. This tile belongs to the seed assembly, so the current assembly will be fully cleared.';
const UPDATE_NO_SEED_MESSAGE = 'Warning, updating this tile will revert the simulation assembly to the seed.';

const DELETE_SEED_MESSAGE = 'Warning, deleting this tile will clear the simulation assembly. This tile belongs to the seed assembly, so the current assembly will be fully cleared.';
const DELETE_NO_SEED_MESSAGE = 'Warning, deleting this tile will revert the simulation assembly to the seed.';


export class Editor {

	constructor(simulator) {
		this.simulator = simulator;
		this.newTileButton = document.getElementById('new-tile-button');
		this.newTileButton.disabled = true;

		this.selectedType = undefined;
	}

	init() {
		const domparser = new DOMParser();
		this.form = domparser.parseFromString(AssetManager.getFile('tile_properties_html'), 'text/html');

		this.inputs = {
			tileName: this.form.getElementById('tile-name-input'),
			tileLabel: this.form.getElementById('tile-label-input'),
			tileColor: this.form.getElementById('tile-color-input'),
			northLabel: this.form.getElementById('north-glue-label-input'),
			northStrength: this.form.getElementById('north-glue-strength-input'),
			eastLabel: this.form.getElementById('east-glue-label-input'),
			eastStrength: this.form.getElementById('east-glue-strength-input'),
			southLabel: this.form.getElementById('south-glue-label-input'),
			southStrength: this.form.getElementById('south-glue-strength-input'),
			westLabel: this.form.getElementById('west-glue-label-input'),
			westStrength: this.form.getElementById('west-glue-strength-input'),
		};

		this.updateTileButton = this.form.getElementById('update-tile-button');
		this.deleteTileButton = this.form.getElementById('delete-tile-button');

		this.updateTileButton.addEventListener('click', () => { this.onUpdateTile(); });
		this.deleteTileButton.addEventListener('click', () => { this.onDeleteTile(); });
		this.newTileButton.addEventListener('click', () => { this.onAddTile(); });

		this.setFormDisabled(true);

		const properties = document.getElementById('tile-properties');
		properties.appendChild(this.form.getElementById('tile-form'));
	}

	setTiles(tileset) {
		this.tileset = tileset;

		const tileTypes = this.tileset.getTileTypes();
		const tileList = document.getElementById('tile-list');

		while (this.newTileButton.nextSibling) {
			tileList.removeChild(this.newTileButton.nextSibling)
		}

		for (const type of tileTypes) {
			const tile_elem = document.createElement('button');
			const box_span = document.createElement('span');
			box_span.classList.add('material-icons', 'w3-small');
			box_span.appendChild(document.createTextNode('square'));
			box_span.style.color = type.color.getHexString();
			tile_elem.appendChild(box_span);
			tile_elem.appendChild(document.createTextNode(type.name));
			tile_elem.classList.add('tile-list-entry', 'w3-bar-item', 'w3-border-bottom', 'w3-button', 'w3-small', 'w3-white', 'w3-hover-pale-green', 'w3-left-align');
			tileList.appendChild(tile_elem);

			tile_elem.addEventListener('click', () => { this.simulator.selectTile(type) });
		}

		this.newTileButton.disabled = false;
	}

	onSelectTile(type) {
		this.selectedType = type;

		if (!type) {
			this.setFormDisabled(true);

			this.inputs.tileName.value = '';
			this.inputs.tileLabel.value = '';
			this.inputs.tileColor.value = '#ffffff';

			for (const dir of ['north', 'east', 'south', 'west']) {
				this.inputs[`${dir}Label`].value = '';
				this.inputs[`${dir}Strength`].value = 0;
			}
		} else {
			this.setFormDisabled(false);

			this.inputs.tileName.value = type.name;
			this.inputs.tileLabel.value = type.label;
			this.inputs.tileColor.value = type.color.getHexString();

			for (const dir of ['north', 'east', 'south', 'west']) {
				if (type.glues[dir]) {
					this.inputs[`${dir}Label`].value = type.glues[dir].label;
					this.inputs[`${dir}Strength`].value = type.glues[dir].strength;
				} else {
					this.inputs[`${dir}Label`].value = '';
					this.inputs[`${dir}Strength`].value = 0;
				}
			}
		}
	}

	setFormDisabled(disabled=true) {
		Object.keys(this.inputs).forEach((key, index) => {
			this.inputs[key].disabled = disabled;
		});

		this.updateTileButton.disabled = disabled;
		this.deleteTileButton.disabled = disabled;
	}

	onUpdateTile() {
		let typeInSeed = false;
		for (const tile of this.simulator.seedTiles) {
			if (this.selectedType.id === tile.type.id) {
				typeInSeed = true;
				break;
			}
		}

		const warning = typeInSeed ? UPDATE_SEED_MESSAGE : UPDATE_NO_SEED_MESSAGE;
		if ( !confirm(warning) )
			return false;
		

		const oldName = this.selectedType.name;
		const newName = this.inputs.tileName.value;

		const newType = {
			name: this.inputs.tileName.value,
			label: this.inputs.tileLabel.value,
			color: parseColor(this.inputs.tileColor.value),
			glues: {},
			id: this.selectedType.id,
		};

		for (const dir of ['north', 'east', 'south', 'west']) {
			const label = this.inputs[`${dir}Label`].value.trim();
			const strength = parseInt(this.inputs[`${dir}Strength`].value);
			
			if (label === '' || strength === NaN) {
				newType.glues[dir] = null;
			} else {
				newType.glues[dir] = {
					label: label,
					strength: strength,
				};
			}
		}

		this.simulator.tileset.updateTileType(this.selectedType.id, newType);

		if (oldName === newName) {
			Logger.log(Logger.INFO, `updated tile "${oldName}"`);
		} else {
			Logger.log(Logger.INFO, `updated tile "${oldName}" (now "${newName}")`);
		}

		this.setTiles(this.simulator.tileset);
		this.simulator.reset(!typeInSeed);
		this.simulator.selectTile(newType);
	}

	onDeleteTile() {
		let typeInSeed = false;
		for (const tile of this.simulator.seedTiles) {
			if (this.selectedType.id === tile.type.id) {
				typeInSeed = true;
				break;
			}
		}

		const warning = typeInSeed ? DELETE_SEED_MESSAGE : DELETE_NO_SEED_MESSAGE;
		if ( !confirm(warning) )
			return false;

		const oldName = this.selectedType.name;

		this.simulator.tileset.removeTileType(this.selectedType.id);

		Logger.log(Logger.INFO, `deleted tile "${oldName}"`);

		this.setTiles(this.simulator.tileset);
		this.simulator.reset(!typeInSeed);
		this.simulator.selectTile(undefined);
	}

	onAddTile() {
		let tileName = "New Tile";

		if (this.simulator.tileset.hasTileWithName(tileName)) {
			let num = 1;
			while (this.simulator.tileset.hasTileWithName(`${tileName} (${num})`)) num++;
			tileName = `${tileName} (${num})`;
		}

		const type = {
			name: tileName,
			label: '',
			color: parseColor('white'),
			glues: {
				north: null,
				east: null,
				south: null,
				west: null,
			},
			id: undefined,
		};

		this.simulator.tileset.addTileType(type);

		Logger.log(Logger.INFO, `added new tile "${tileName}"`);

		this.setTiles(this.simulator.tileset);
		this.simulator.selectTile(type);
	}
}