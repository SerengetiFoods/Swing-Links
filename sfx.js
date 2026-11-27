// Swing Links shared sound system: one audio context for every game,
// self-healing after iOS interruptions (permission pop-ups, speech, calls),
// plus extra sounds: whooshes, cheers, claps, ambience and an announcer voice.
window.SL = (() => {
  let AC = null, banner = null, checkTimer = null, master = null;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;

  function setSession() { try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {} }

  function ac() {
    try {
      if (!AC && AudioCtor) {
        setSession();
        AC = new AudioCtor();
        master = AC.createDynamicsCompressor();
        master.threshold.value = -10; master.ratio.value = 4;
        master.connect(AC.destination);
        AC.onstatechange = () => {
          if (AC.state === 'running') hideBanner();
          else { AC.resume().catch(() => {}); setTimeout(check, 600); }
        };
        if (!checkTimer) checkTimer = setInterval(check, 1500);
      }
      if (AC && AC.state !== 'running') AC.resume().catch(() => {});
    } catch (e) {}
    return AC;
  }
  const out = () => (ac(), master || (AC && AC.destination));

  function unlock() {
    const a = ac(); if (!a) return;
    try { const b = a.createBuffer(1, 1, 22050), s = a.createBufferSource(); s.buffer = b; s.connect(a.destination); s.start(); } catch (e) {}
    if (a.state === 'running') hideBanner();
  }
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach(ev => addEventListener(ev, unlock, { capture: true, passive: true }));

  function check() { if (AC && AC.state !== 'running') showBanner(); }
  function showBanner() {
    if (!document.body) return;
    if (!banner) {
      banner = document.createElement('button');
      banner.textContent = 'Sound is off. Tap here to turn it on';
      banner.style.cssText = 'position:fixed;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);z-index:99;font:800 15px Archivo,system-ui,sans-serif;color:#fff;background:#ef4b36;border:0;border-radius:999px;padding:12px 18px;box-shadow:0 6px 20px rgba(0,0,0,.4)';
      banner.onclick = () => { unlock(); setTimeout(check, 400); };
      document.body.appendChild(banner);
    }
    banner.hidden = false;
  }
  function hideBanner() { if (banner) banner.hidden = true; }

  function panner(a, pan) { if (!pan || !a.createStereoPanner) return out(); const p = a.createStereoPanner(); p.pan.value = pan; p.connect(out()); return p; }

  function tone(f, dur, vol, at, type, pan) {
    const a = ac(); if (!a) return; const t = a.currentTime + Math.max(0, at || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(panner(a, pan)); o.start(t); o.stop(t + dur + .03);
  }
  function noise(dur, freq, type, vol, at, pan, shape) {
    const a = ac(); if (!a) return; const n = Math.max(1, Math.floor(a.sampleRate * dur)), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) { const u = i / n; d[i] = (Math.random() * 2 - 1) * (shape === 'swell' ? Math.sin(Math.PI * u) : (1 - u) ** 3); }
    const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = a.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(panner(a, pan)); s.start(a.currentTime + Math.max(0, at || 0));
  }
  // swing whoosh: a quick band-passed sweep
  function whoosh(vol = .5, at = 0, pan = 0) {
    const a = ac(); if (!a) return; const dur = .28, n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / n) ** 2;
    const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    const t = a.currentTime + at; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(2600, t + dur * .6); f.frequency.exponentialRampToValueAtTime(900, t + dur);
    const g = a.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(panner(a, pan)); s.start(t);
  }
  function clap(at = 0, vol = .35) { noise(.06, 1500 + Math.random() * 1500, 'bandpass', vol, at, (Math.random() - .5) * 1.4); }
  // crowd reaction: 0 = polite applause, 1 = cheer, 2 = big roar
  function cheer(level = 1) {
    const dur = [1.6, 2.6, 3.6][level], claps = [14, 30, 55][level];
    noise(dur, 900, 'bandpass', [.18, .45, .7][level], 0, 0, 'swell');
    if (level) noise(dur * .8, 400, 'lowpass', [0, .35, .6][level], .05, 0, 'swell');
    for (let i = 0; i < claps; i++) clap(Math.random() * dur * .9, .25 + Math.random() * .2);
    if (level === 2) for (let i = 0; i < 4; i++) tone(500 + Math.random() * 300, .35, .06, Math.random() * 1.5, 'triangle');
  }
  function aww() { const a = ac(); if (!a) return; const t = a.currentTime, o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(150, t + 1.1); f.type = 'lowpass'; f.frequency.value = 700;
    g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(.12, t + .15); g.gain.exponentialRampToValueAtTime(.001, t + 1.2); o.connect(f); f.connect(g); g.connect(out()); o.start(t); o.stop(t + 1.3);
    noise(1.2, 500, 'bandpass', .15, 0, 0, 'swell'); }

  // ambience loops: 'outdoor' (wind + birds), 'alley' (crowd murmur), 'cage' (indoor hum)
  let amb = null, birdTimer = null;
  function ambience(kind, level = .5) {
    stopAmbience(); const a = ac(); if (!a || !kind) return;
    const len = a.sampleRate * 3, b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(); s.buffer = b; s.loop = true; const f = a.createBiquadFilter(), g = a.createGain();
    if (kind === 'outdoor') { f.type = 'lowpass'; f.frequency.value = 380; g.gain.value = .07 * level; }
    else if (kind === 'alley') { f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = .7; g.gain.value = .1 * level; }
    else { f.type = 'lowpass'; f.frequency.value = 160; g.gain.value = .12 * level; }
    s.connect(f); f.connect(g); g.connect(out()); s.start(); amb = { s, g };
    if (kind === 'outdoor') { const chirp = () => { const base = 2400 + Math.random() * 2200, n = 2 + Math.floor(Math.random() * 4), p = (Math.random() - .5) * 1.6;
        for (let i = 0; i < n; i++) { const A = ac(); if (!A) break; const t = A.currentTime + i * .11, o = A.createOscillator(), gg = A.createGain(); o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * 1.35, t + .07);
          gg.gain.setValueAtTime(.0001, t); gg.gain.exponentialRampToValueAtTime(.05 * level, t + .02); gg.gain.exponentialRampToValueAtTime(.0001, t + .09); o.connect(gg); gg.connect(panner(A, p)); o.start(t); o.stop(t + .1); }
        birdTimer = setTimeout(chirp, 1800 + Math.random() * 4500); }; birdTimer = setTimeout(chirp, 1200); }
    if (kind === 'alley') { const far = () => { noise(.35, 2000, 'bandpass', .05 * level, 0, (Math.random() - .5) * 1.8); birdTimer = setTimeout(far, 3000 + Math.random() * 6000); }; birdTimer = setTimeout(far, 2500); }
  }
  function stopAmbience() { clearTimeout(birdTimer); if (amb) { try { amb.s.stop(); } catch (e) {} amb = null; } }

  // announcer voice (iOS-safe)
  function say(text, opts = {}) {
    if (opts.off || !window.speechSynthesis) return;
    try { const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = opts.rate || 1.08; u.pitch = opts.pitch || 1; window.__slU = u;
      u.onend = u.onerror = () => { if (AC && AC.state !== 'running') AC.resume().catch(() => {}); };
      if (!opts.queue && (speechSynthesis.speaking || speechSynthesis.pending)) { speechSynthesis.cancel(); setTimeout(() => speechSynthesis.speak(u), 45); } else speechSynthesis.speak(u); } catch (e) {}
  }
  return { ac, unlock, tone, noise, whoosh, clap, cheer, aww, ambience, stopAmbience, say, check };
})();
