import { useState } from "react";
import { RAW } from "../data/styles";

/** A style's preview frame, with a graceful colour fallback if the image can't load. */
export function Frame({
  folder,
  hue,
  label,
  className = "",
  eager = false,
}: {
  folder: string;
  hue: number;
  label: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className={`relative overflow-hidden bg-neutral-900 ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, hsl(${hue} 45% 22%), hsl(${(hue + 40) % 360} 50% 12%))`,
      }}
    >
      {!failed && (
        <img
          src={`${RAW}/docs/frames/${folder}.jpg`}
          alt={label}
          loading={eager ? "eager" : "lazy"}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      {(failed || !loaded) && (
        <div className="absolute inset-0 flex items-center justify-center p-3 text-center font-display text-sm text-white/70">
          {failed ? label : ""}
        </div>
      )}
    </div>
  );
}
