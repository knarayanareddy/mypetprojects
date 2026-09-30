import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";

export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
  style,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "p" | "h2" | "h3";
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.isIntersecting) {
            el.classList.add("in");
            io.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Any = Tag as unknown as React.ElementType;
  return (
    <Any ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </Any>
  );
}

export function useInView<T extends HTMLElement>(margin = "0px") {
  const ref = useRef<T>(null);
  const state = useRef(false);
  return { ref, state, margin };
}
