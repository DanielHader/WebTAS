<script>
  import { onMount } from "svelte";
  import Split from "split-grid";

  let editor_gutter;
  let log_gutter;
  let simulator_gutter;
  let tile_gutter;
  
  onMount(() => {
      const split = Split({
	  rowGutters: [
              {
	          track: 1,
	          element: document.getElementById("editor-gutter")
	      },
              {
		  track: 3,
		  element: document.getElementById("log-gutter")
	      }
          ],
	  columnGutters: [
              {
	          track: 3,
	          element: document.getElementById("simulator-gutter")
	      },
	      {
		  track: 1,
		  element: document.getElementById('tile-gutter')
	      }
          ],
	  onDrag: (direction, track, gridTemplateStyle) => {
              console.log("dragging");
	  }
      })

      return () => { split.destroy(); };
  });
</script>

<header>
  <div class="w3-bar w3-light-grey">
    <span class="w3-bar-item w3-green"><span class="webtas-logo"><b>WebTAS</b></span></span>
    <div class="w3-dropdown-hover">
      <button class="w3-button">File</button>
      <div class="w3-dropdown-content w3-bar-block w3-card-4">
        <button id="load-system-button" class="w3-bar-item w3-button">Load System</button>
        <input type="file" multiple="true" id="load-system-input" style="display: none;"/>
        <button id="save-system-button" class="w3-bar-item w3-button">Save System</button>
        <button id="open-example-button" class="w3-bar-item w3-button">Open Example</button>
      </div>
    </div>
    <div class="w3-dropdown-hover">
      <button class="w3-button">Settings</button>
      <div class="w3-dropdown-content w3-bar-block w3-card-4">
        <button id="set-temperature-button" class="w3-bar-item w3-button">Set Temperature</button>
        <button id="set-background-color-button" class="w3-bar-item w3-button">Set Background Color</button>
        <input id="bg-color-input" type="color" value="#ffffee" style="display: none;" />
      </div>
    </div>
    <div class="w3-dropdown-hover">
      <button class="w3-button">System</button>
      <div class="w3-dropdown-content w3-bar-block w3-card-4">
        <button id="reset-to-seed-button" class="w3-bar-item w3-button">Reset To Seed</button>
      </div>
    </div>
  </div>
</header>

<div id="container">
  <div id="tile-list-panel">
    <div id="tile-list-header" class="w3-bar w3-green"><div class="w3-bar-item">Tile List</div></div>
    <div id="tile-list">
      <button id="new-tile-button" class="tile-list-entry w3-border w3-button w3-small w3-light-gray w3-hover-green w3-left-align">
        <span class="material-icons w3-small">add_box</span> New Tile
      </button>
    </div>
  </div>

  <div id="tile-view-panel">
    <div id="tile-view-header" class="w3-bar w3-green"><div class="w3-bar-item">Selected Tile</div></div>
    <div id="tile-view">
      <canvas id="tile-canvas"></canvas>
    </div>
  </div>

  <div id="tile-properties-panel">
    <div id="tile-properties-header" class="w3-bar w3-green"><div class="w3-bar-item">Tile Properties</div></div>
    <div id="tile-properties"></div>
  </div>

  <div id="simulator-panel" style="width: 100%">
    <div id="sim-bar" class="w3-bar w3-light-grey">
      <button id="fast-back-button" class="w3-bar-item w3-button"><span class="material-icons">fast_rewind</span></button>
      <button id="step-back-button" class="w3-bar-item w3-button"><span class="material-icons">skip_previous</span></button>
      <button id="stop-button" class="w3-bar-item w3-button"><span class="material-icons">stop</span></button>
      <button id="step-forward-button" class="w3-bar-item w3-button"><span class="material-icons">skip_next</span></button>
      <button id="fast-forward-button" class="w3-bar-item w3-button"><span class="material-icons">fast_forward</span></button>
      <div class="w3-bar-item bar-divider"></div>
      <button id="select-mode-button" class="w3-bar-item w3-button"><span class="material-icons">highlight_alt</span></button>
      <button id="place-mode-button" class="w3-bar-item w3-button"><span class="material-icons">edit</span></button>
      <button id="zoom-out-button" class="w3-bar-item w3-button w3-right"><span class="material-icons">zoom_out</span></button>
      <button id="zoom-in-button" class="w3-bar-item w3-button w3-right"><span class="material-icons">zoom_in</span></button>
    </div>
    <div id="simulator">
      <canvas id="sim-canvas"></canvas>
      <svg id="sim-canvas" width="100%" height="100%"></svg>
    </div>
    <div id="sim-info" class="w3-small w3-light-grey">Simulator</div>
  </div>
  
  <div id="log-panel">
    <div id="log-header" class="w3-bar w3-green"><div class="w3-bar-item">Simulation Log</div></div>
    <div id="log-container"></div>
  </div>

  <div id="editor-gutter" bind:this={editor_gutter} class="gutter"></div>
  <div id="simulator-gutter" bind:this={simulator_gutter} class="gutter"></div>
  <div id="log-gutter" bind:this={log_gutter} class="gutter"></div>
  <div id="tile-gutter" bind:this={tile_gutter} class="gutter"></div>
</div>

<style>
  @import "./styles/w3.css";
  @import "./styles/webtas.css";
</style>
