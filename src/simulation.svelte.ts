
enum PlaybackState = {
    Stopped = "Stopped",
    Playing = "Playing",
    Rewinding = "Rewinding",
}

class Simulation {
    playback_state: PlaybackState;

    public constructor() {
        this.playback_state = PlaybackState.Stopped;
    }
}
