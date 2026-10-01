export type ShotFn = (t: number, lt: number, dur: number) => void;
export interface Shot {
  a: number;
  fn: ShotFn;
  year?: string;
  label?: string;
}
