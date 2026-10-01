import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "./utils/cn";

export type Lang = "both" | "en" | "zh";

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "both",
  setLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("both");
  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

/** Bilingual text. In "both" mode English is primary, Chinese sits beneath (or inline). */
export function Bi({
  en,
  zh,
  inline = false,
  className,
  zhClassName,
}: {
  en: ReactNode;
  zh: ReactNode;
  inline?: boolean;
  className?: string;
  zhClassName?: string;
}) {
  const { lang } = useLang();
  if (lang === "en") return <span className={className}>{en}</span>;
  if (lang === "zh") return <span className={className}>{zh}</span>;
  if (inline)
    return (
      <span className={className}>
        {en} <span className={cn("opacity-60 font-normal", zhClassName)}>· {zh}</span>
      </span>
    );
  return (
    <span className={cn("block", className)}>
      <span className="block">{en}</span>
      <span className={cn("block opacity-60 text-[0.82em] font-normal mt-0.5", zhClassName)}>{zh}</span>
    </span>
  );
}
