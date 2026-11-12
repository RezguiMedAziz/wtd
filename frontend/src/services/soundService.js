import { storageService } from './storageService';

let ctx = null;
export const isMuted = () => storageService.get('soundMuted', false) === true;
export const setMuted = (m) => storageService.set('soundMuted', m);

// Short synthesized "qua-ack" (no audio file needed). Only ever called from a click handler.
export function playQuack() {
  if (isMuted()) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    if (ctx.state === 'suspended') ctx.resume();
    const t0 = ctx.currentTime;
    [[0, 640, 330], [0.15, 520, 250]].forEach(([off, f0, f1]) => {
      const o = ctx.createOscillator();
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0, t0 + off);
      o.frequency.exponentialRampToValueAtTime(f1, t0 + off + 0.12);
      f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 2;
      g.gain.setValueAtTime(0.0001, t0 + off);
      g.gain.exponentialRampToValueAtTime(0.14, t0 + off + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.13);
      o.connect(f); f.connect(g); g.connect(ctx.destination);
      o.start(t0 + off); o.stop(t0 + off + 0.15);
    });
  } catch {
    /* audio not available */
  }
}
