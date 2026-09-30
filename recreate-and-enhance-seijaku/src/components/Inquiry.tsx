import { useState, type FormEvent } from "react";
import { SEASONS } from "../scene/layout";
import { Reveal } from "./Reveal";

export function Inquiry() {
  const [sent, setSent] = useState<null | { name: string; season: string }>(null);
  const [name, setName] = useState("");
  const [season, setSeason] = useState("autumn");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    setSent({ name: String(fd.get("name") || "friend"), season: String(fd.get("season")) });
  };

  const field =
    "w-full border-b border-washi/25 bg-transparent py-3 text-[16px] text-washi placeholder:text-washi/35 outline-none transition focus:border-[#f0b79f]";

  return (
    <section id="inquire" className="relative bg-sumi px-6 py-28 text-washi sm:px-10 md:py-40">
      <div className="mx-auto grid max-w-[1240px] gap-16 md:grid-cols-[1fr_1fr] md:gap-24">
        <div>
          <Reveal>
            <p className="eyebrow mb-8 flex items-center gap-4 text-washi/55">
              <span>07</span>
              <span className="h-px w-10 bg-washi/30" />
              Inquire
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-serif text-[clamp(44px,7vw,100px)] leading-[0.95] tracking-[-0.025em]">
              Stay a <em className="text-[#f0b79f]">while.</em>
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-8 max-w-[42ch] text-[16px] leading-[1.75] text-washi/70">
              Seijaku is a design concept — an interface study for an imagined residence in northern Kyoto. There is no property, no price and no agent. The form is here to show how a quiet enquiry might feel.
            </p>
            <div className="mt-10 grid max-w-[420px] grid-cols-2 gap-6 border-t border-washi/15 pt-8">
              <div>
                <p className="eyebrow text-[10px] text-washi/45">Guide price</p>
                <p className="mt-2 font-serif text-[34px] leading-none">Concept</p>
              </div>
              <div>
                <p className="eyebrow text-[10px] text-washi/45">Floor area</p>
                <p className="mt-2 font-serif text-[34px] leading-none">242 m²</p>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <div className="rounded-[26px] border border-washi/12 bg-white/[0.035] p-7 sm:p-10">
            {sent ? (
              <div className="rise flex min-h-[420px] flex-col justify-center">
                <div className="mb-6 grid h-14 w-14 place-items-center rounded-full border border-[#f0b79f] text-[#f0b79f]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </div>
                <h3 className="font-serif text-[44px] leading-none">Thank you, {sent.name}.</h3>
                <p className="mt-5 max-w-[40ch] text-[15px] leading-relaxed text-washi/70">
                  A visit in <span className="text-[#f0b79f]">{sent.season}</span> would have been lovely. This is a demonstration only — nothing was sent, and nothing was stored.
                </p>
                <button
                  onClick={() => {
                    setSent(null);
                    setName("");
                  }}
                  className="eyebrow mt-8 self-start rounded-full border border-washi/40 px-5 py-2.5 text-[10.5px] transition hover:bg-washi hover:text-sumi"
                >
                  Start over
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-7">
                <label className="block">
                  <span className="eyebrow text-[10px] text-washi/50">Name</span>
                  <input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={field} required />
                </label>
                <label className="block">
                  <span className="eyebrow text-[10px] text-washi/50">Email</span>
                  <input name="email" type="email" placeholder="you@example.com" className={field} required />
                </label>
                <fieldset>
                  <legend className="eyebrow mb-3 text-[10px] text-washi/50">Preferred season to visit</legend>
                  <div className="grid grid-cols-4 gap-2">
                    {SEASONS.map((s) => (
                      <label key={s.id} className="cursor-pointer">
                        <input type="radio" name="season" value={s.en.toLowerCase()} checked={season === s.id} onChange={() => setSeason(s.id)} className="peer sr-only" />
                        <span className="flex flex-col items-center rounded-xl border border-washi/20 py-3 transition peer-checked:border-[#f0b79f] peer-checked:bg-[#f0b79f] peer-checked:text-sumi hover:border-washi/50 peer-focus-visible:ring-2 peer-focus-visible:ring-[#f0b79f]">
                          <span className="font-jp text-xl leading-none">{s.jp}</span>
                          <span className="eyebrow mt-1.5 text-[9px] opacity-70">{s.en}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block">
                  <span className="eyebrow text-[10px] text-washi/50">Message</span>
                  <textarea name="message" rows={3} placeholder="What would you like to know?" className={field + " resize-none"} />
                </label>
                <button type="submit" className="eyebrow mt-2 flex items-center justify-center gap-3 rounded-full bg-[#b5482d] px-7 py-4 text-[11px] text-white transition hover:bg-[#c65a3e]">
                  Send demonstration enquiry
                  <svg width="18" height="8" viewBox="0 0 18 8" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M0 4h17M13 1l4 3-4 3" />
                  </svg>
                </button>
                <p className="text-center text-[11.5px] leading-relaxed text-washi/45">Demonstration only — submitting shows a local confirmation. No message is sent and nothing is stored.</p>
              </form>
            )}
          </div>
        </Reveal>
      </div>

      <footer className="mx-auto mt-28 flex max-w-[1240px] flex-col justify-between gap-6 border-t border-washi/12 pt-8 text-[12.5px] text-washi/45 md:flex-row">
        <p>
          <span className="font-serif text-[20px] text-washi/80">Seijaku</span> <span className="font-jp ml-2">静寂</span>
        </p>
        <p className="max-w-[60ch] leading-relaxed">
          A reinterpretation of Meng To's Seijaku — an independent architectural visualization study. Every surface, tree, koi and ripple here is generated procedurally in the browser with Three.js and Web Audio; no original artwork is reused.
        </p>
      </footer>
    </section>
  );
}
