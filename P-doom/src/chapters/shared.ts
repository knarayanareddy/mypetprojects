// @ts-nocheck
import { PAL, S, W, H, clamp, lerp, bpOf, beatN, pulse, hash, push, pop, translate, scale, rotate, paint, rectPts, ellPts, TAU, inkLine, ease, easeOut, backOut } from '../engine/core';
import { clawd, dancer, researcher, move } from '../engine/clawd';
import { stage, meterProp } from '../engine/cast';
import { pdoomAt } from '../engine/timeline';

const HATS = ['party', 'band', 'crown', 'wizard', 'top', 'party', 'hard'];
// The shared P(doom) Show stage: same set in all four choruses, escalating each time.
// o: { th, v, leadU, leadStyle, troupeU, troupe, researcher:{...}, crack, pumpRate, hats, leadExtra }
export function chorusStage(t: number, o: any = {}) {
  const th = o.th || 'party', v = o.v ?? pdoomAt(t), bp = bpOf(t);
  stage(t, th);
  const n = o.troupe ?? 6, tu = o.troupeU ?? 12;
  for (let i = 0; i < n; i++) {
    const x = 170 + i * ((W - 340) / (n - 1)), seed = i * 0.5;
    dancer(x, 770 + (i % 2) * 14, tu, o.troupeStyle || 'mix', t, { seed, hat: (o.hats || HATS)[i % HATS.length], col: o.troupeCol, noShadow: false, eyes: o.troupeEyes });
  }
  const rate = o.pumpRate ?? 1, pm = 0.5 + 0.5 * Math.sin(bp * Math.PI * rate), pmEase = pm;
  meterProp(1560, 830, o.meterS ?? 0.95, v, { pump: pmEase, crack: o.crack });
  const lu = o.leadU ?? 38, lx = o.leadX ?? 1180;
  const m: any = move(o.leadStyle || 'bounce', t, 0);
  clawd(lx, 960, lu, { ...m, flip: false, aR: 0.9 + pmEase * 0.7, aL: 0.5 + Math.abs(Math.sin(bp * 2)) * 0.6, dy: -Math.abs(Math.sin(bp * Math.PI)) * 0.8, eyes: o.leadEyes || 'happy', mouth: o.leadMouth || 'grin', hat: o.leadHat, ...(o.leadExtra || {}) });
  const rs = o.researcher || {};
  if (!o.noResearcher) researcher(o.rx ?? 560, 975, o.rs ?? 25, { glasses: 'swirl', mouth: 'o', emote: '?', emoteK: backOut(Math.sin(bp * Math.PI * 0.5) * 2), dy: -Math.abs(Math.sin(bp * Math.PI * 0.5)) * 0.5, rot: Math.sin(bp * Math.PI) * 0.06, aL: 1 + Math.sin(bp * 2) * 0.4, aR: 1.1 - Math.sin(bp * 2) * 0.4, ...rs });
}
void lerp; void beatN; void pulse; void hash; void push; void pop; void translate; void scale; void rotate; void paint; void rectPts; void ellPts; void TAU; void inkLine; void ease; void easeOut; void clamp; void H; void S; void PAL;
