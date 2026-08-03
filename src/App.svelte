<script>
  import { onMount } from "svelte";
  import Split from "split-grid";
  
  import Simulator from "./Simulator.svelte";
  import TileView from "./TileView.svelte";
  import Log from "./Log.svelte";

  let editor_gutter;
  let log_gutter;
  let simulator_gutter;
  //let tile_gutter;
  
  onMount(() => {
      const split = Split({
	  rowGutters: [
              { track: 1, element: editor_gutter },
              { track: 3, element: log_gutter }
          ],
          columnGutters: [
              { track: 3, element: simulator_gutter },
          //    { track: 1, element: tile_gutter }
          ],
          onDrag: (direction, track, gridTemplateStyle) => {
              // update simulator here
	  }
      });

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
  
  <TileView />
  <Simulator />
  <Log />

  <div id="editor-gutter" bind:this={editor_gutter} class="gutter"></div>
  <div id="simulator-gutter" bind:this={simulator_gutter} class="gutter"></div>
  <div id="log-gutter" bind:this={log_gutter} class="gutter"></div>
</div>

<style>
  @import "./styles/w3.css";
  @import "./styles/webtas.css";
</style>
