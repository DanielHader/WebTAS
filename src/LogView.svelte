<script lang="ts">
  import { logEntries, log, LogLevel } from "./logging.svelte.ts";

  const levelClasses: Record<LogLevel, string> = {
      [LogLevel.Debug]:   "w3-pale-green w3-border-green",
      [LogLevel.Info]:    "w3-pale-blue w3-border-blue",
      [LogLevel.Warning]: "w3-pale-yellow w3-border-yellow",
      [LogLevel.Error]:   "w3-pale-red w3-border-red",
  };

  log(LogLevel.Info, "hello hello");
  log(LogLevel.Info, "this is a test");
  log(LogLevel.Debug, "what about debug messages?");
  log(LogLevel.Warning, "uh oh you need to be careful");
  log(LogLevel.Error, "now you've done something wrong");
</script>

<div id="log-panel">
  <div id="log-header" class="w3-bar w3-green"><div class="w3-bar-item">Simulation Log</div></div>
  <div id="log-container">
    {#each logEntries as logEntry}
      <div class="log-entry w3-small w3-container w3-leftbar w3-rightbar w3-border-bottom w3-monospace {levelClasses[logEntry.level]}">
        <div class="log-type">
          {logEntry.levelString()}
        </div>
        <div class="log-message w3-border-left w3-border-right">
          {logEntry.message}
        </div>
        <div class="log-date">
          {logEntry.dateString()}
        </div>
      </div>
    {/each}
  </div>
</div>
