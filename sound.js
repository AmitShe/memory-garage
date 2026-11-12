export function makeSound(button, storageKey) {
  let muted = false;
  let audio;
  let air;
  try { muted = localStorage.getItem(storageKey) === "yes"; } catch {}
  button.setAttribute("aria-pressed", String(!muted));

  function voice(time, duration, from, to, volume, type = "sine", pulse = 0) {
    const tone = audio.createOscillator();
    const amp = audio.createGain();
    const filter = audio.createBiquadFilter();
    tone.type = type;
    tone.frequency.setValueAtTime(from, time);
    tone.frequency.exponentialRampToValueAtTime(to, time + duration);
    filter.type = "lowpass";
    filter.frequency.value = type === "sawtooth" ? 650 : 1700;
    amp.gain.setValueAtTime(.001, time);
    amp.gain.linearRampToValueAtTime(volume, time + Math.min(.05, duration / 3));
    amp.gain.exponentialRampToValueAtTime(.001, time + duration);
    if (pulse) {
      const oscillator = audio.createOscillator();
      const depth = audio.createGain();
      oscillator.frequency.value = pulse;
      depth.gain.value = volume * .24;
      oscillator.connect(depth).connect(amp.gain);
      oscillator.start(time);
      oscillator.stop(time + duration);
    }
    tone.connect(filter).connect(amp).connect(audio.destination);
    tone.start(time);
    tone.stop(time + duration + .015);
  }

  function noise(time, duration, volume, from, to, pulse = 0) {
    if (!air) {
      air = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
      const samples = air.getChannelData(0);
      for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
    }
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const amp = audio.createGain();
    source.buffer = air;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(from, time);
    filter.frequency.exponentialRampToValueAtTime(to, time + duration);
    amp.gain.setValueAtTime(.001, time);
    amp.gain.linearRampToValueAtTime(volume, time + duration * .25);
    if (pulse) {
      for (let index = 1; index / pulse < duration * .86; index++) {
        amp.gain.setValueAtTime(volume * .2, time + index / pulse);
        amp.gain.linearRampToValueAtTime(volume, time + (index + .4) / pulse);
      }
    }
    amp.gain.linearRampToValueAtTime(0, time + duration);
    source.connect(filter).connect(amp).connect(audio.destination);
    source.start(time);
    source.stop(time + duration);
  }

  const cues = {
    plane(t) {
      voice(t, .66, 142, 93, .12, "sawtooth", 27);
      noise(t, .6, .15, 920, 450, 27);
    },
    crane(t) {
      voice(t, .49, 118, 197, .08, "sawtooth");
      for (const delay of [.04, .21, .38]) voice(t + delay, .07, 760, 760, .085);
    },
    car(t) {
      voice(t, .25, 76, 142, .15, "sawtooth");
      voice(t + .23, .34, 107, 222, .14, "sawtooth");
    },
    tractor(t) {
      voice(t, .57, 52, 66, .14, "sawtooth", 10);
      noise(t, .48, .13, 250, 365, 10);
    },
    rocket(t) {
      noise(t, .8, .23, 320, 2200);
      voice(t, .78, 83, 228, .09, "sawtooth");
    },
    train(t) {
      for (const delay of [0, .13, .26, .39]) noise(t + delay, .085, .17, 900, 425);
      voice(t + .26, .34, 496, 470, .12, "triangle");
      voice(t + .26, .34, 630, 608, .057);
    },
    firetruck(t) {
      for (const [i, pitch] of [650, 960, 650, 960].entries()) {
        voice(t + i * .14, .17, pitch, pitch, .115, "triangle");
      }
    },
    boat(t) {
      voice(t, .58, 168, 163, .15, "triangle");
      voice(t, .53, 250, 244, .07);
      noise(t + .22, .45, .12, 600, 330);
    },
    helicopter(t) {
      noise(t, .64, .24, 510, 430, 15);
      voice(t, .61, 80, 78, .10, "triangle", 15);
    },
    flip(t) { noise(t, .09, .15, 1600, 850); },
    miss(t) { voice(t, .19, 187, 129, .07, "triangle"); }
  };

  function play(cue) {
    if (muted) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      audio ||= new Audio();
      if (audio.state === "suspended") audio.resume().catch(() => {});
      cues[cue](audio.currentTime + .02);
    } catch {}
  }

  button.addEventListener("click", () => {
    muted = !muted;
    try { localStorage.setItem(storageKey, muted ? "yes" : "no"); } catch {}
    button.setAttribute("aria-pressed", String(!muted));
    if (muted) audio?.suspend().catch(() => {});
    else play("flip");
  });
  return play;
}
