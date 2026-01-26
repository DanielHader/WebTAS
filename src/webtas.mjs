
import * as THREE from './three.module.mjs';

import * as AssetManager from './assetmanager.mjs';

import { Logger } from './logger.mjs';
import { Simulator } from './simulator.mjs';
import { throttle } from './utils.mjs';
import { SimpleDataTable, TileType } from './rectilinear_generator.mjs';

// import Split from './split-grid.min.js'

let simulator;

// document fully loaded including stylesheets, images, etc.
window.addEventListener('load', () => {
	simulator.resize();
});

// document loaded without waiting for stylesheets, images, etc.
document.addEventListener('DOMContentLoaded', () => {
    initLayout();

    Logger.init(document.getElementById('log-container'));

    AssetManager.loadAssets(onAssetsLoaded);
	simulator = new Simulator();
	simulator.setBackgroundColor(document.getElementById('bg-color-input').value, false);

    document.getElementById("load-system-button").addEventListener('click', onSystemLoadButton);
    document.getElementById("save-system-button").addEventListener('click', onSystemSaveButton);
	document.getElementById("save-png-button").addEventListener('click', onPNGSaveButton);
	document.getElementById("save-svg-button").addEventListener('click', onSVGSaveButton);
    document.getElementById("open-example-button").addEventListener('click', onOpenExampleButton);
    document.getElementById("create-rectilinear-button").addEventListener('click', onCreateRectilinearButton);

    document.getElementById('bg-color-input').addEventListener('change', (e) => { simulator.setBackgroundColor(e.target.value); });
    document.getElementById('set-background-color-button').addEventListener('click', () => { document.getElementById('bg-color-input').click(); });
    document.getElementById('set-temperature-button').addEventListener('click', onSetTemperatureButton);
	document.getElementById('set-simulation-mode-menu').addEventListener('click', onSetSimulationModeMenu);
	document.getElementById('report-nondeterminism-checkbox').addEventListener('click', onReportNondeterminism);

    /* set behavior for rectilinear generator buttons start */

    document.getElementById('rl-reset-truth-table-button').addEventListener('click', () => {
    	updateRectilinearTruthTable();
    });

    document.getElementById('rl-truth-table-function-button').addEventListener('click', () => {
    	generateRectilinearTruthTable();
    });

    document.getElementById('rl-generate-button').addEventListener('click', () => {
    	generateRectilinearTiles();
    	document.getElementById('create-rectilinear-modal').style.display='none';
    });

    document.getElementById('create-rectilinear-close-button').addEventListener('click', () => {
    	document.getElementById('create-rectilinear-modal').style.display='none';
    });

    rlTable = new SimpleDataTable(document.getElementById("rl-truth-table"));
    rlTable.setHeaders(['Vert Input', 'Horz Input', 'Vert Output', 'Horz Output', 'Color']);

    rlSetInputVals();
    rlTable.load(rlTableVals);
    rlTable.render();

    document.getElementById('rl-truth-table-function').value = rlDefaultFunction;

    // allow tabs to be entered in text area
    document.getElementById('rl-truth-table-function').addEventListener('keydown', function(e) {
		if (e.key == 'Tab') {
			e.preventDefault();
			var start = this.selectionStart;
			var end = this.selectionEnd;
			this.value = this.value.substring(0, start) + "\t" + this.value.substring(end);
			this.selectionStart = this.selectionEnd = start + 1;
		}
	});

    /* set behavior for rectilinear generator buttons end */

	document.getElementById('simulation-mode-close-button').addEventListener('click', () => {
    	document.getElementById('set-simulation-mode-modal').style.display='none';
    });

	document.getElementById('set-simulation-mode-confirm-button').addEventListener('click', onSetSimulationMode);

    document.getElementById('temperature-close-button').addEventListener('click', () => {
    	document.getElementById('set-temperature-modal').style.display='none';
    });

    document.getElementById('set-temperature-confirm-button').addEventListener('click', onSetTemperature);

	document.getElementById('temperature-sequence-close-button').addEventListener('click', () => {
    	document.getElementById('set-temperature-sequence-modal').style.display='none';
    });

	document.getElementById('set-temperature-sequence-confirm-button').addEventListener('click', onSetTemperatureSequence);

    document.getElementById('save-close-button').addEventListener('click', () => {
    	document.getElementById('save-system-modal').style.display='none';
    });

	document.getElementById('save-png-close-button').addEventListener('click', () => {
    	document.getElementById('save-png-modal').style.display='none';
    });

	document.getElementById('save-svg-close-button').addEventListener('click', () => {
    	document.getElementById('save-svg-modal').style.display='none';
    });

    document.getElementById('save-system-confirm-button').addEventListener('click', () => {
    	document.getElementById('save-system-modal').style.display='none';

    	const filename = document.getElementById('save-system-name').value;
    	const blobs = simulator.saveSystem(filename);

    	if (blobs === null) {
    		alert('No system to save. Please open a system before saving');
    		return;
    	}

    	const tdpBlob = blobs[0];
    	const tdsBlob = blobs[1];

    	const a_tdp = document.createElement('a');
    	const a_tds = document.createElement('a');

    	const url_tdp = URL.createObjectURL(tdpBlob);
    	const url_tds = URL.createObjectURL(tdsBlob);

    	a_tdp.href = url_tdp;
    	a_tds.href = url_tds;
    	
    	a_tdp.download = filename + '.tdp';
    	a_tds.download = filename + '.tds';

    	document.body.appendChild(a_tdp);
    	document.body.appendChild(a_tds);

    	a_tdp.click();
    	a_tds.click();

    	setTimeout(() => {
    		document.body.removeChild(a_tdp);
    		document.body.removeChild(a_tds);
    		
    		window.URL.revokeObjectURL(url_tdp);
    		window.URL.revokeObjectURL(url_tds);
    	}, 0);

    	Logger.log(Logger.INFO, `saved current system as ${filename}.tdp and ${filename}.tds`);
    });

    document.getElementById('examples-close-button').addEventListener('click', () => {
		document.getElementById('examples-modal').style.display='none';
	});

	document.getElementById('example-confirm-button').addEventListener('click', () => {
		document.getElementById('examples-modal').style.display='none';
		const select = document.getElementById('example-select');
		const tdp = AssetManager.getFile(`${select.value}_tdp`);
		const tds = AssetManager.getFile(`${select.value}_tds`);
		simulator.loadSystem({tdp: {name: `${select.value}.tdp`, src: tdp}, tds: {name: `${select.value}.tds`, src: tds}});
	});
});

function render() {
	requestAnimationFrame(render);

	simulator.render();
}

// called when all assets have been loaded
function onAssetsLoaded() {
    simulator.init();

    render();
}

function onSystemLoadButton() {
	const input = document.createElement('input');
	input.type = 'file';
	input.multiple = 'true';
	input.onchange = () => {
		const files = input.files;
		let tdpFile = null;
	    let tdsFile = null;
	    for (const file of files) {
			if (file.name.toLowerCase().endsWith(".tdp"))
			    tdpFile = file;
			else if (file.name.toLowerCase().endsWith(".tds"))
			    tdsFile = file;
	    }

	    if (tdpFile === null || tdsFile === null) {
			alert("Failed to load system: Please provide both a .tdp file and a .tds file when loading a tile system.");
			return;
	    }

	    const tdpPromise = new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => { resolve(reader.result); };
			reader.onerror = reject;
			reader.readAsText(tdpFile);
	    });

	    const tdsPromise = new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => { resolve(reader.result); };
			reader.onerror = reject;
			reader.readAsText(tdsFile);
	    });
	    
	    Promise.all([tdpPromise, tdsPromise]).then((values) => {
			simulator.loadSystem({tdp: {name: tdpFile.name, src: values[0]}, tds: {name: tdsFile.name, src: values[1]}});
	    });
	};
	input.click();
}

function onSystemSaveButton() {
	document.getElementById('save-system-modal').style.display='block';
}

function onPNGSaveButton() {
	//document.getElementById('save-png-modal').style.display='block';
	simulator.renderCanvasAndSave();
}

function onSVGSaveButton() {
	document.getElementById('save-svg-modal').style.display='block';
}

function onSetSimulationModeMenu() {
	document.getElementById('set-simulation-mode-modal').style.display='block';
	document.getElementById('simulation-mode-select').value = simulator.simulation_mode;
}

function onReportNondeterminism() {
	const b_report = document.getElementById('report-nondeterminism-checkbox').checked;
	simulator.tileWorker.postMessage({ msg: 'report-nondeterminism', b_report: b_report});
	let msg = '';
	if (b_report === false) {
		msg = 'not ';
	}
	Logger.log(Logger.INFO, `locations of nondeterminism (where multiple tile types can attach) will ${msg}be reported`);
}

function onSetSimulationMode() {
	document.getElementById('set-simulation-mode-modal').style.display='none';
}

function onOpenExampleButton() {
	document.getElementById('examples-modal').style.display='block';
}

function onSetTemperatureButton() {
	document.getElementById('set-temperature-modal').style.display='block';
	document.getElementById('temperature-input').value = simulator.temperature;
}

function onSetTemperature() {
	const tempStr = document.getElementById('temperature-input').value;
	const temp = parseInt(tempStr);

	if (isNaN(temp) || temp <= 0) {
		alert('Temperature must be a positive integer');
		// document.getElementById('set-temperature-modal').style.display='none';
		return;
	}

	simulator.setTemperature(temp);
	document.getElementById('set-temperature-modal').style.display='none';
}

function onSetTemperatureSequence() {
	const tempSeqStr = document.getElementById('temperature-sequence-input').value;
	const temp_seq_array = tempSeqStr.split(',');
	simulator.setTemperatureSequence(tempSeqStr);
	document.getElementById('set-temperature-sequence-modal').style.display='none';
	simulator.setTemperature(temp_seq_array[0]);
}

function initLayout() {
	window.Split({
		rowGutters: [{
			track: 1,
			element: document.getElementById("editor-gutter")
		},
		{
			track: 3,
			element: document.getElementById("log-gutter")
		}],
		columnGutters: [{
			track: 3,
			element: document.getElementById("simulator-gutter")
		},
		{
			track: 1,
			element: document.getElementById('tile-gutter')
		}],
		// rowMinSize: {
		// 	0: 100, 2: 100, 4: 100,
		// },
		onDrag: (direction, track, gridTemplateStyle) => {
			simulator.resize();
		}
	})
}

// variables for rectilinear generator
const rlDefaultVals = [[0,0,0,0,'White'], [0,1,0,0,'White'], [1,0,0,0,'White'], [1,1,0,0,'White']];
const rlSierpinskiVals = [[0,0,0,0,'White'], [0,1,1,1,'Red'], [1,0,1,1,'Red'], [1,1,0,0,'White']];
const rlBinaryCounterVals = [[0,0,0,0,'White'], [0,1,1,0,'Red'], [1,0,1,0,'Red'], [1,1,0,1,'White']];

const rlDefaultBoundaries = {vert: {value: 0, color: 'White'}, horz: {value: 0, color: 'White'}};
const rlSierpinskiBoundaries = {vert: {value: 1, color: 'Red'}, horz: {value: 1, color: 'Red'}};
const rlBinaryCounterBoundaries = {vert: {value: 1, color: 'White'}, horz: {value: 0, color: 'White'}};

const rlDefaultFunction = "(vertIn, horzIn) => {\n\
\tlet vertOut = 0;\n\
\tlet horzOut = 0;\n\
\tlet color = 'White';\n\
\t\n\
\treturn {vertOut: vertOut, horzOut: horzOut, color: color}; \n\
}";

const rlSierpinskiFunction = "(vertIn, horzIn) => {\n\
\tlet vertOut = vertIn ^ horzIn;\n\
\tlet horzOut = vertOut;\n\
\tlet color = (vertOut == 0) ? 'White' : 'Red';\n\
\t\n\
\treturn {vertOut: vertOut, horzOut: horzOut, color: color};\n\
}";
const rlBinaryCounterFunction = "(vertIn, horzIn) => {\n\
\tlet vertOut = (vertIn + horzIn) % 2;\n\
\tlet horzOut = Math.floor((vertIn + horzIn) / 2);\n\
\tlet color = (vertOut == 0) ? 'White' : 'Red';\n\
\t\n\
\treturn {vertOut: vertOut, horzOut: horzOut, color: color};\n\
}";

const rlBinaryVals = [0, 1];
let rlHorzInVals = rlBinaryVals;
let rlVertInVals = rlBinaryVals;
let rlDirection = 'NW';
let rlTableVals = rlDefaultVals;
let rlBoundaries = rlDefaultBoundaries;

let rlTable = null;

function rlSetInputVals() {
	document.getElementById('rl-horz-input').value = rlHorzInVals;
	document.getElementById('rl-vert-input').value = rlVertInVals;

}

function rlGetInputVals() {
	rlHorzInVals = document.getElementById('rl-horz-input').value.split(',');
	rlVertInVals = document.getElementById('rl-vert-input').value.split(',');

	for (let i = 0; i < rlHorzInVals.length; i++)
		if (!isNaN(parseInt(rlHorzInVals[i]))) rlHorzInVals[i] = parseInt(rlHorzInVals[i]);

	for (let i = 0; i < rlVertInVals.length; i++)
		if (!isNaN(parseInt(rlVertInVals[i]))) rlVertInVals[i] = parseInt(rlVertInVals[i]);

	rlTableVals = [];
	for (let i = 0; i < rlVertInVals.length; i++) {
		for (let j = 0; j < rlHorzInVals.length; j++) {
			const tableRow = [rlVertInVals[i], rlHorzInVals[j], 0, 0, 'White'];
			rlTableVals.push(tableRow);
		}
	}
}

function rlSetBoundaries() {
	document.getElementById('rl-vert-boundary').value = rlBoundaries.vert.value;
	document.getElementById('rl-horz-boundary').value = rlBoundaries.horz.value;

	document.getElementById('rl-vert-boundary-color').value = rlBoundaries.vert.color;
	document.getElementById('rl-horz-boundary-color').value = rlBoundaries.horz.color;
}

function rlGetBoundaries() {
	rlBoundaries.vert.value = document.getElementById('rl-vert-boundary').value;
	rlBoundaries.horz.value = document.getElementById('rl-horz-boundary').value;

	rlBoundaries.vert.color = document.getElementById('rl-vert-boundary-color').value;
	rlBoundaries.horz.color = document.getElementById('rl-horz-boundary-color').value;

}

function onCreateRectilinearButton() {
	document.getElementById('rl-truth-table');
	document.getElementById('create-rectilinear-modal').style.display='block';
}

function updateRectilinearTruthTable() {
	const option = document.getElementById('rl-input-values').value;
	if (option == 'rl-default-input') {
		rlGetInputVals();
		rlBoundaries = rlDefaultBoundaries;
		rlSetBoundaries();
		document.getElementById('rl-truth-table-function').value = rlDefaultFunction;
	} else if (option == 'rl-sierpinski-input') {
		rlBoundaries = rlSierpinskiBoundaries;
		rlSetBoundaries();
		rlHorzInVals = rlBinaryVals;
		rlVertInVals = rlBinaryVals;
		rlSetInputVals();
		rlTableVals = rlSierpinskiVals;
		document.getElementById('rl-truth-table-function').value = rlSierpinskiFunction;
	} else if (option == 'rl-binary-counter-input') {
		rlBoundaries = rlBinaryCounterBoundaries;
		rlSetBoundaries();
		rlHorzInVals = rlBinaryVals;
		rlVertInVals = rlBinaryVals;
		rlSetInputVals();
		rlTableVals = rlBinaryCounterVals;
		document.getElementById('rl-truth-table-function').value = rlBinaryCounterFunction;
	}
	rlTable.load(rlTableVals);
	rlTable.render();
}

function generateRectilinearTruthTable() {
	const functionText = document.getElementById('rl-truth-table-function').value;
	
	const computeOutputs = eval(functionText);

	const computedVals = [];

	for (let v of rlVertInVals) {
		if (!isNaN(parseInt(v))) v = parseInt(v);

		let computedRow = null;

		for (let h of rlHorzInVals) {
			if (!isNaN(parseInt(h))) h = parseInt(h);

			const retVals = computeOutputs(v, h);

			computedRow = [v, h, retVals.vertOut, retVals.horzOut, retVals.color];
			computedVals.push(computedRow);
		}
	}

	const tableVals = computedVals;
	rlTable.load(tableVals);
	rlTable.render();
}

function getTileTypeFromRectilinearTableRow(list, direction) {
	let name = list[0] + ',' + list[1];
	let label = list[2] + ',' + list[3];
	let color = list[4];//parseColor(list[4]);
	
	let directed_list = [list[2], list[1], list[0], list[3]];
	if (direction == 'NE') {
		directed_list = [list[2], list[3], list[0], list[1]];
	} else if (direction == 'SE') {
		directed_list = [list[0], list[3], list[2], list[1]];
	} else if (direction == 'SW') {
		directed_list = [list[0], list[1], list[2], list[3]];
	}
	let glues = {
		north: { label: directed_list[0], strength: 1 },
		east:  { label: directed_list[1], strength: 1 },
		south: { label: directed_list[2], strength: 1 },
		west:  { label: directed_list[3], strength: 1 }
	};
	
	let type = new TileType(name, label, color, glues);
	
	return type;
}

function generateRectilinearTiles() {
	const tileList = [];
	
	const direction = document.getElementById('rl-growth-direction').value

	rlGetBoundaries();
	
	let glues = {
		north: { label: '', strength: 0 },
		east:  { label: '', strength: 0 },
		south: { label: '', strength: 0 },
		west:  { label: '', strength: 0 },
	}
	if ((direction == 'NW') || (direction == 'NE')) {
		glues.north = { label: 'V', strength: 2 };
	}
	if ((direction == 'SW') || (direction == 'SE')) {
		glues.south = { label: 'V', strength: 2 };
	}
	if ((direction == 'NW') || (direction == 'SW')) {
		glues.west = { label: 'H', strength: 2 };
	}
	if ((direction == 'NE') || (direction == 'SE')) {
		glues.east = { label: 'H', strength: 2 };
	}
	
	const seedType = new TileType('Seed', 'Seed', 'Green', glues);
	tileList.push(seedType);
	
	// Vertical boundary
	glues = {
		north: { label: 'V', strength: 2 },
		east:  { label: '', strength: 0 },
		south: { label: 'V', strength: 2 },
		west:  { label: '', strength: 0 }
	};
	if ((direction == 'NW') || (direction == 'SW')) {
		glues.west = { label: rlBoundaries.vert.value, strength: 1 };
	} else {
		glues.east = { label: rlBoundaries.vert.value, strength: 1 };
	}
	const vertType = new TileType('V', rlBoundaries.vert.value, rlBoundaries.vert.color, glues);
	tileList.push(vertType);
	
	// Horizontal boundary
	glues = {
		north: { label: '', strength: 0 },
		east:  { label: 'H', strength: 2 },
		south: { label: '', strength: 0 },
		west:  { label: 'H', strength: 2 }
	};
	if ((direction == 'NW') || (direction == 'NE')) {
		glues.north = { label: rlBoundaries.horz.value, strength: 1 };
	} else {
		glues.south = { label: rlBoundaries.horz.value, strength: 1 };
	}
	const horzType = new TileType('H', rlBoundaries.horz.value, rlBoundaries.horz.color, glues);
	tileList.push(horzType);

	for (var i = 1; i < rlTable.getRowsCount(); i++) {
		var tableRow = [];
		for (var j = 0; j < 5; j++) {
			var cell = rlTable.getCell(i,j);
			if (cell != null) {
				tableRow.push(cell.childNodes[0].value);
			} else {
				tableRow.push(0);
			}
		}
		const type = getTileTypeFromRectilinearTableRow(tableRow, direction);
		tileList.push(type);
	}
	
	//var tileSet = new TileSet();
	let tileSetStr = '';
	
	// console.log('Tile set:');
	for (var i = 0; i < tileList.length; i++) {
		// console.log(tileList[i]);
		//tileSet.addTileType(type);
		tileSetStr += tileList[i].outputString();
	}
	//return tileSet;

	const assemblyStr = 'rectilinear.tds\ntemperature=2\nSeed 0 0';

	simulator.loadSystem({tdp: {name: 'rectilinear.tdp', src: assemblyStr}, tds: {name: 'rectilinear.tds', src: tileSetStr}});
	
	// /////////////////////////////////////////////////////////////////////////////////////////
	// // TESTING: Writing to a file for now...
	// // Create element with <a> tag
	// const link = document.createElement("a");

	// // Create a blog object with the file content which you want to add to the file
	// const file = new Blob([tileSetStr], { type: 'text/plain' });

	// // Add file content in the object URL
	// link.href = URL.createObjectURL(file);

	// // Add file name
	// link.download = "rectilinear.tds";

	// // Add click event to <a> tag to save file.
	// link.click();
	// URL.revokeObjectURL(link.href);
}