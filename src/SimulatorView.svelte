<script>
  import { onMount } from "svelte";

  import * as THREE from "three"
  
  let canvas;
  let renderer;
  let scene = new THREE.Scene();
  let camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 10);
  camera.position.z = 4;

  // canvas dirty bit, when true next frame will re-render
  let redrawFlag = true;
  
  function render() {
      if (redrawFlag) {
          redrawFlag = false;
      }

      renderer.render(scene, camera);
  }
  
  onMount(() => {
      renderer = new THREE.WebGLRenderer({
          antialias: true,
          canvas: canvas,
          preserveDrawingBuffer: true,
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setClearColor(0xffffee);

      function frameLoop() {
          requestAnimationFrame(frameLoop);
          render();
      }
      frameLoop();
      
      return () => {
          cancelAnimationFrame(frameLoop);
      }
  });
  
</script>

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
    <canvas id="sim-canvas" bind:this={canvas}></canvas>
    <svg id="sim-canvas" width="100%" height="100%"></svg>
  </div>
  <div id="sim-info" class="w3-small w3-light-grey">Simulator</div>
</div>
