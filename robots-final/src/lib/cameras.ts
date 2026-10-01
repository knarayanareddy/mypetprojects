// Camera slots (top / side / wrist) – getUserMedia streams + JPEG frame grabber for VLM / policy inputs.
export const CAM_SLOTS = ["top", "side", "wrist"] as const;
export type CamSlot = (typeof CAM_SLOTS)[number];

interface Slot { stream: MediaStream | null; video: HTMLVideoElement | null; deviceId: string; label: string }

class Cameras {
  slots: Record<CamSlot, Slot> = {
    top: { stream: null, video: null, deviceId: "", label: "" },
    side: { stream: null, video: null, deviceId: "", label: "" },
    wrist: { stream: null, video: null, deviceId: "", label: "" },
  };
  listeners = new Set<() => void>();
  version = 0;
  private emit() { this.version++; this.listeners.forEach((l) => l()); }
  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  getVersion = () => this.version;

  async list(): Promise<MediaDeviceInfo[]> {
    try {
      // a permission prompt is needed before labels are visible
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
      tmp.getTracks().forEach((t) => t.stop());
    } catch { /* ignore – may be denied */ }
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((d) => d.kind === "videoinput");
  }

  async start(slot: CamSlot, deviceId: string, label = "") {
    this.stop(slot);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
    });
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    this.slots[slot] = { stream, video, deviceId, label: label || stream.getVideoTracks()[0]?.label || deviceId };
    this.emit();
  }

  stop(slot: CamSlot) {
    this.slots[slot].stream?.getTracks().forEach((t) => t.stop());
    this.slots[slot] = { stream: null, video: null, deviceId: "", label: "" };
    this.emit();
  }

  active(slot: CamSlot) { return !!this.slots[slot].stream; }
  activeSlots(): CamSlot[] { return CAM_SLOTS.filter((s) => this.active(s)); }

  /** returns base64 JPEG (no data: prefix) */
  grab(slot: CamSlot, size = 448, quality = 0.7): string | null {
    const v = this.slots[slot].video;
    if (!v || !v.videoWidth) return null;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d")!;
    const s = Math.min(v.videoWidth, v.videoHeight);
    ctx.drawImage(v, (v.videoWidth - s) / 2, (v.videoHeight - s) / 2, s, s, 0, 0, size, size);
    return c.toDataURL("image/jpeg", quality).split(",")[1];
  }

  grabAll(size = 448): Record<string, string> {
    const out: Record<string, string> = {};
    for (const s of this.activeSlots()) { const f = this.grab(s, size); if (f) out[s] = f; }
    return out;
  }
}
export const cameras = new Cameras();
