import { Bi } from "../lang";
import { GALLERY, REPO } from "../data/styles";

export function Footer() {
  return (
    <footer id="licence" className="scroll-mt-16 border-t border-line bg-black py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-gold">
              <span className="h-px w-10 bg-gold" />
              <span>Licence · 授权</span>
            </div>
            <p className="font-display text-2xl">
              Made by <b className="text-gold">LemoLab × Claude Opus 5.5</b>. MIT licensed.
            </p>
            <p className="mt-4 max-w-2xl text-sm text-cream/75">
              <Bi
                en="Third-party assets in the demos keep their own licences (see each demo's CREDITS); you are responsible for the materials you use in your films."
                zh="LemoLab × Claude Opus 5.5 出品，MIT 协议。样片中的第三方素材沿用各自的授权（见各样片的 CREDITS）；你在自己片子里使用的素材由你负责。"
              />
            </p>
          </div>
          <div className="flex flex-col gap-3 text-sm md:items-end">
            <a href={GALLERY} target="_blank" rel="noreferrer" className="hover:text-gold">
              ▶ Official gallery · 看图鉴
            </a>
            <a href={REPO} target="_blank" rel="noreferrer" className="hover:text-gold">
              GitHub · lemomo-ai/lemo-opuscar ↗
            </a>
            <a href="https://github.com/lemomo-ai" target="_blank" rel="noreferrer" className="hover:text-gold">
              @lemomo-ai ↗
            </a>
            <a href={`${REPO}/issues`} target="_blank" rel="noreferrer" className="hover:text-gold">
              Issues · 反馈 ↗
            </a>
          </div>
        </div>
        <p className="mt-12 text-center text-xs text-cream/40">
          Unofficial fan-built browser of the OPUSCAR repo · every preview frame is loaded from the original repository.
        </p>
      </div>
    </footer>
  );
}
