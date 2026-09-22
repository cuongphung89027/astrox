/** Short, dry wooden impacts; created from the cast button's user gesture. */
export function playShakeAudio(): () => void {
  let context: AudioContext;
  try { context = new AudioContext(); } catch { return () => {}; }
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    document.removeEventListener("visibilitychange", hide);
    clearTimeout(end);
    void context.close().catch(() => {});
  };
  const hide = () => { if (document.hidden) stop(); };
  const end = setTimeout(stop, 3800);
  document.addEventListener("visibilitychange", hide);
  void context.resume().then(() => {
    if (stopped) return;
    const master = context.createGain();
    master.gain.value = 0.22;
    master.connect(context.destination);
    const noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.065), context.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (context.sampleRate * 0.012));
    const start = context.currentTime + 0.015;
    // Each direction change produces a small cluster of loose bamboo impacts.
    for (let beat = 0; beat < 20; beat++) {
      for (let hit = 0; hit < 3; hit++) {
        const time = start + beat * (Math.PI / 18) + hit * 0.021 + Math.random() * 0.012;
        const source = context.createBufferSource(); source.buffer = noise;
        source.playbackRate.value = 0.8 + Math.random() * 0.5;
        const filter = context.createBiquadFilter(); filter.type = "bandpass";
        filter.frequency.value = 950 + Math.random() * 1500; filter.Q.value = 1.4;
        const gain = context.createGain();
        const strength = (0.5 + Math.random() * 0.4) * (hit === 0 ? 1 : 0.55);
        gain.gain.setValueAtTime(strength, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.075);
        source.connect(filter); filter.connect(gain); gain.connect(master);
        source.start(time); source.stop(time + 0.09);
        const body = context.createOscillator(); body.type = "sine";
        body.frequency.setValueAtTime(580 + Math.random() * 450, time);
        const resonance = context.createGain(); resonance.gain.setValueAtTime(strength * 0.22, time);
        resonance.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
        body.connect(resonance); resonance.connect(master); body.start(time); body.stop(time + 0.04);
      }
    }
  }).catch(stop);
  return stop;
}
