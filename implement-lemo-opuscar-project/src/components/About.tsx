import { Bi } from "../lang";

const how = [
  { icon: "🖼️", en: "Canvas and WebGL pages rendered frame by frame", zh: "Canvas 和 WebGL 页面逐帧渲染" },
  { icon: "🎹", en: "Original music from free sample libraries", zh: "用免费采样库写原创配乐" },
  { icon: "🎙️", en: "Text-to-speech narration", zh: "TTS 配音" },
  { icon: "🚫", en: "No video generation, no stock footage", zh: "不用视频生成，也不用素材库画面" },
];

export function About() {
  return (
    <section id="about" className="scroll-mt-16 border-y border-line bg-panel/50 py-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-gold">
            <span className="h-px w-10 bg-gold" />
            <span>👋 About me · 关于我</span>
          </div>
          <h2 className="font-display text-4xl font-bold tracking-tight">
            I'm <span className="text-gold">Lemomo</span>
            <span className="ml-3 text-2xl text-cream/60">我是 Lemomo</span>
          </h2>
          <p className="mt-4 text-cream/85">
            <Bi
              en={
                <>
                  I'm <b>Lemomo</b> (
                  <a className="text-gold underline-offset-4 hover:underline" href="https://github.com/lemomo-ai" target="_blank" rel="noreferrer">
                    @lemomo-ai
                  </a>
                  ). More about me on my profile.
                </>
              }
              zh={
                <>
                  我是 <b>Lemomo</b>，更多信息见我的{" "}
                  <a className="text-gold underline-offset-4 hover:underline" href="https://github.com/lemomo-ai" target="_blank" rel="noreferrer">
                    GitHub 主页
                  </a>
                  。
                </>
              }
            />
          </p>

          <blockquote className="mt-8 rounded-r-xl border-l-4 border-gold bg-black/40 p-5 text-cream/90">
            <p>
              <b className="text-gold">Not an awesome list.</b> Every film here was made by me, with Claude Opus 5.5. The
              styles are tuned for Opus 5.5; other models may not reproduce them.
            </p>
            <p className="mt-3 text-cream/70">
              <b className="text-gold">这不是一个 awesome 合集。</b>
              这里所有的片子都是我自己用 Claude Opus 5.5 做的。风格是按 Opus 5.5 调出来的，换成其他模型不保证能做出同样的效果。
            </p>
          </blockquote>
        </div>

        <div>
          <p className="text-lg text-cream/90">
            <Bi
              en="Every film was directed, drawn, scored and mixed by an AI agent writing code: canvas and WebGL pages rendered frame by frame, original music from free sample libraries, text-to-speech narration. No video generation, no stock footage."
              zh="每一支片子都是 AI agent 写代码导演、作画、配乐、混音的：Canvas 和 WebGL 页面逐帧渲染，用免费采样库写原创配乐，TTS 配音。不用视频生成，也不用素材库画面。"
            />
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {["Directed · 导演", "Drawn · 作画", "Scored · 配乐", "Mixed · 混音"].map((x) => (
              <div key={x} className="rounded-lg border border-line bg-ink px-4 py-2 text-sm text-gold">
                {x}
              </div>
            ))}
          </div>
          <ul className="mt-6 space-y-3">
            {how.map((h) => (
              <li key={h.en} className="flex items-start gap-3 rounded-xl border border-line bg-ink p-4">
                <span className="text-xl">{h.icon}</span>
                <Bi en={h.en} zh={h.zh} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
