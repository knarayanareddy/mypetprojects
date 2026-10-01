"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RobotModel, Stage } from "@/lib/robot3d";
import { BASE } from "@/lib/scenarios/dsl";
import type { Sim } from "@/lib/sim";
import type { Pose } from "@/lib/kin";
import type { Arm } from "@/lib/scenarios/types";

const GROUND: Record<string, number> = { stage: 0x1a2133, lab: 0x8fa3b8, home: 0x8a6a4c, factory: 0x3d4656 };
const MAX_PTS = 6000;

interface Props {
  sim: Sim;
  rev: string; // changes when the scenario scene must be rebuilt
  override?: (arm: Arm) => Pose | null; // e.g. hardware pose for the digital twin
  ghost?: boolean; // draw sim pose as translucent when overridden
  className?: string;
}

export default function SimView({ sim, rev, override, className }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ rebuild: () => void } | null>(null);
  const overrideRef = useRef(override);
  overrideRef.current = override;
  const simRef = useRef(sim);
  simRef.current = sim;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const stage = new Stage(el, { bg: "#080c16" });
    stage.camera.position.set(2, 52, 62);
    stage.controls.target.set(0, 3, -4);
    stage.controls.minDistance = 25;
    stage.controls.maxDistance = 160;

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 160), new THREE.MeshStandardMaterial({ color: 0x1a2133, roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    stage.scene.add(ground);
    const grid = new THREE.GridHelper(120, 24, 0x334155, 0x1e293b);
    grid.position.y = 0.02;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    stage.scene.add(grid);

    const robots: Record<Arm, RobotModel> = { a: new RobotModel("follower", "#ff7a1a"), b: new RobotModel("follower", "#38bdf8") };
    (["a", "b"] as Arm[]).forEach((k) => {
      robots[k].root.position.set(BASE[k][0], 0, BASE[k][2]);
      robots[k].root.rotation.y = -Math.PI / 2;
      stage.scene.add(robots[k].root);
    });

    const world = new THREE.Group();
    stage.scene.add(world);
    let fixMeshes: THREE.Mesh[] = [];
    let objMeshes: THREE.Mesh[] = [];
    const lines: THREE.Line[] = [];

    const geo = (shape: string, s: number[]) => (shape === "box" ? new THREE.BoxGeometry(s[0], s[1], s[2]) : shape === "cyl" ? new THREE.CylinderGeometry(s[0] / 2, s[0] / 2, s[1], 28) : new THREE.SphereGeometry(s[0] / 2, 20, 16));

    const rebuild = () => {
      const s = simRef.current;
      world.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | undefined;
        mat?.dispose?.();
      });
      world.clear();
      lines.length = 0;
      (ground.material as THREE.MeshStandardMaterial).color.setHex(GROUND[s.scenario.theme ?? "stage"]);
      fixMeshes = s.scenario.fixtures.map((f) => {
        const mat = new THREE.MeshStandardMaterial({ color: f.color, roughness: 0.6, transparent: f.opacity !== undefined, opacity: f.opacity ?? 1 });
        const m = new THREE.Mesh(geo(f.shape, f.size), mat);
        m.position.set(...f.pos);
        m.castShadow = true;
        m.receiveShadow = true;
        m.userData.y0 = f.pos[1];
        world.add(m);
        return m;
      });
      objMeshes = s.objs.map((o) => {
        const m = new THREE.Mesh(geo(o.def.shape, o.def.size), new THREE.MeshStandardMaterial({ color: o.def.color, roughness: 0.45 }));
        m.castShadow = true;
        m.receiveShadow = true;
        m.userData.color = o.def.color;
        world.add(m);
        return m;
      });
    };
    rebuild();
    api.current = { rebuild };

    const q = new THREE.Quaternion();
    const ax = new THREE.Vector3();

    stage.onFrame = (dt) => {
      const s = simRef.current;
      s.update(dt);
      (["a", "b"] as Arm[]).forEach((k) => {
        const ov = overrideRef.current?.(k);
        robots[k].setPose(ov ?? s.arms[k].pose);
      });
      s.fix.forEach((f, i) => {
        const m = fixMeshes[i];
        if (!m) return;
        const fx = s.scenario.fixtures[i];
        m.position.y = (m.userData.y0 as number) - f.depress * 0.45;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (fx.trigger) {
          mat.emissive.setHex(fx.trigger.flash);
          mat.emissiveIntensity = f.flash * 1.1;
        }
      });
      s.objs.forEach((o, i) => {
        const m = objMeshes[i];
        if (!m) return;
        m.position.set(o.pos[0], o.pos[1], o.pos[2]);
        m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
        if (o.held && Math.abs(o.tilt) > 1e-3) {
          ax.set(o.tiltAxis[0], o.tiltAxis[1], o.tiltAxis[2]).normalize();
          q.setFromAxisAngle(ax, o.tilt * (Math.PI / 180));
          m.quaternion.premultiply(q);
        }
        m.scale.setScalar(o.scale);
        if (m.userData.color !== o.color) {
          (m.material as THREE.MeshStandardMaterial).color.setHex(o.color);
          m.userData.color = o.color;
        }
      });
      // trails
      s.trails.forEach((t, i) => {
        let ln = lines[i];
        if (!ln || ln.userData.trail !== t) {
          if (ln) {
            world.remove(ln);
            ln.geometry.dispose();
          }
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_PTS * 3), 3));
          ln = new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color(t.color) }));
          ln.frustumCulled = false;
          ln.userData.trail = t;
          lines[i] = ln;
          world.add(ln);
        }
        const attr = ln.geometry.getAttribute("position") as THREE.BufferAttribute;
        const n = Math.min(t.pts.length, MAX_PTS);
        if (ln.userData.n !== n) {
          for (let k = ln.userData.n ?? 0; k < n; k++) attr.setXYZ(k, t.pts[k][0], t.pts[k][1], t.pts[k][2]);
          attr.needsUpdate = true;
          ln.geometry.setDrawRange(0, n);
          ln.userData.n = n;
        }
      });
      while (lines.length > s.trails.length) {
        const ln = lines.pop()!;
        world.remove(ln);
        ln.geometry.dispose();
      }
    };

    return () => {
      stage.dispose();
      api.current = null;
    };
  }, []);

  useEffect(() => {
    api.current?.rebuild();
  }, [rev]);

  return <div ref={host} className={className ?? "h-full w-full"} />;
}
