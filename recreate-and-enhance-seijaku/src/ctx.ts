import { createContext, useContext } from "react";
import type { Season, Hour } from "./scene/layout";

export interface AppCtx {
  season: Season;
  setSeason: (s: Season) => void;
  hour: Hour;
  setHour: (h: Hour) => void;
  jumpKf: (kf: number, roomId?: string) => void;
  inspecting: boolean;
}

export const Ctx = createContext<AppCtx>(null as unknown as AppCtx);
export const useApp = () => useContext(Ctx);
