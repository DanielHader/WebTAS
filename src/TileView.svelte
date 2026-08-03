<script>
  import { onMount } from "svelte";
  import Split from "split-grid";
  
  let tile_gutter;

  onMount(() => {
      const split = Split({
          columnGutters: [
              { track: 1, element: tile_gutter }
          ]
      });

      return () => { split.destroy(); };
  });
</script>

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

<div id="tile-gutter" bind:this={tile_gutter} class="gutter"></div>
