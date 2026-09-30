import * as THREE from "three";
import { Item, inst, std, rng } from "./helpers";

export interface PalmSpot {
  x: number;
  z: number;
  y?: number;
  h?: number;
}

/** Instanced coconut / date palms with drooping fronds. */
export function palms(
  parent: THREE.Object3D,
  spots: PalmSpot[],
  seed = 4,
  frond = 0x1c3a22,
  trunk = 0x4a3a2a,
  fronds = 8
) {
  const r = rng(seed);
  const trunks: Item[] = [];
  const crowns: Item[] = [];
  spots.forEach((s) => {
    const h = s.h ?? 9 + r() * 4;
    const y = s.y ?? 0;
    const lean = (r() - 0.5) * 0.18;
    trunks.push({ p: [s.x - Math.sin(lean) * h * 0.5, y + (h / 2) * Math.cos(lean), s.z], rz: lean, s: [1, h / 10, 1] });
    const cx = s.x - Math.sin(lean) * h;
    const cy = y + h * Math.cos(lean);
    const rot0 = r() * 6.28;
    for (let k = 0; k < fronds; k++) {
      crowns.push({
        p: [cx, cy, s.z],
        r: rot0 + (k * Math.PI * 2) / fronds + (r() - 0.5) * 0.3,
        s: 0.85 + r() * 0.4,
      });
    }
  });
  const tg = new THREE.CylinderGeometry(0.28, 0.46, 10, 7);
  inst(tg, std(trunk), trunks, parent);
  const fg = new THREE.ConeGeometry(0.75, 7, 4);
  fg.translate(0, 3.5, 0);
  fg.rotateZ(-Math.PI / 2);
  fg.scale(1, 0.22, 1.7);
  fg.rotateZ(-0.42);
  inst(fg, std(frond, { side: THREE.DoubleSide }), crowns, parent);
}
