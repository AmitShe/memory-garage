const slotLength = .75;
// Keep this order in sync with the clips in toy-shelf.wav.
const cues = [
  "flip", "miss", "car", "train", "crane", "tractor",
  "plane", "helicopter", "rocket", "boat", "firetruck", "finish"
];
const file = new URL("./assets/toy-shelf.wav", import.meta.url);

export function makeSound(button, storageKey) {
  const Audio = window.AudioContext || window.webkitAudioContext;
  let muted = false;
  let context;
  let bytes;
  let decoded;
  let active;
  let request = 0;
  try { muted = localStorage.getItem(storageKey) === "yes"; } catch {}
  button.setAttribute("aria-pressed", String(!muted));

  function load() {
    bytes ??= fetch(file).then(response => {
      if (!response.ok) throw new Error("Cannot load game sounds");
      return response.arrayBuffer();
    }).catch(error => {
      bytes = undefined;
      throw error;
    });
    return bytes;
  }

  function stop() {
    request++;
    if (!active) return;
    const time = context.currentTime;
    active.gain.gain.setTargetAtTime(0, time, .008);
    active.source.stop(time + .035);
    active = undefined;
  }

  async function play(cue) {
    const index = cues.indexOf(cue);
    if (muted || !Audio || index === -1) return;
    stop();
    const current = request;
    try {
      context ??= new Audio();
      const resumed = context.state === "running" ? Promise.resolve() : context.resume();
      decoded ??= load().then(data => context.decodeAudioData(data.slice(0))).catch(error => {
        decoded = undefined;
        throw error;
      });
      const [track] = await Promise.all([decoded, resumed]);
      if (muted || current !== request || context.state !== "running") return;

      const source = context.createBufferSource();
      const gain = context.createGain();
      const offset = index * slotLength;
      source.buffer = track;
      source.connect(gain).connect(context.destination);
      active = { source, gain };
      source.onended = () => {
        if (active?.source === source) active = undefined;
        source.disconnect();
        gain.disconnect();
      };
      source.start(0, offset, cue === "finish" ? track.duration - offset : slotLength);
    } catch {
      // Keep the game playable when audio is unavailable.
    }
  }

  button.addEventListener("click", () => {
    muted = !muted;
    try { localStorage.setItem(storageKey, muted ? "yes" : "no"); } catch {}
    button.setAttribute("aria-pressed", String(!muted));
    if (muted) stop();
    else play("flip");
  });
  if (Audio && !muted) load().catch(() => {});
  return { play, stop };
}
