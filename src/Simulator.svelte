<script>
  
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
    <canvas id="sim-canvas"></canvas>
    <svg id="sim-canvas" width="100%" height="100%"></svg>
  </div>
  <div id="sim-info" class="w3-small w3-light-grey">Simulator</div>
</div>
