import { useState, type ReactNode } from "react";
import { Bi } from "../lang";
import { REPO } from "../data/styles";

function Code({ lines, label }: { lines: string[]; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
    } catch {
      const ta = document.createElement("textarea");
      ta.value = lines.join("\n");
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-black">
      <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs text-cream/50">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          {label && <span className="ml-2">{label}</span>}
        </div>
        <button onClick={copy} className="rounded px-2 py-0.5 transition hover:bg-white/10 hover:text-gold">
          {copied ? "Copied ✓ 已复制" : "Copy 复制"}
        </button>
      </div>
      <pre className="scroll-thin overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-emerald-300">
        {lines.map((l, i) => (
          <div key={i}>
            <span className="select-none text-cream/30">$ </span>
            {l}
          </div>
        ))}
      </pre>
    </div>
  );
}

function H3({ children }: { children: ReactNode }) {
  return <h3 className="font-display text-2xl font-bold tracking-tight">{children}</h3>;
}

export function HowTo() {
  const prompts = [
    {
      en: "Make a 45-second film in the watercolor style about the coffee farm my family runs. Warm female narrator.",
      zh: "用油画厚涂风格做一支 30 秒的片子，讲我家那只每天在窗台等我下班的橘猫。",
      cn: false,
    },
  ];
  return (
    <section id="how" className="scroll-mt-16 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-gold">
          <span className="h-px w-10 bg-gold" />
          <span>How to use · 怎么用</span>
        </div>
        <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Two ways in; the skill is the easiest.
        </h2>
        <p className="mt-2 font-display text-xl text-cream/60">两种用法，推荐装 skill，最省事。</p>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* Option 1 */}
          <div className="rounded-2xl border border-gold/40 bg-panel p-6 sm:p-8">
            <span className="rounded bg-gold px-2 py-0.5 text-xs font-bold text-black">RECOMMENDED · 推荐</span>
            <div className="mt-4">
              <H3>
                <Bi en="Option 1: install the skill" zh="方式一：装成 skill（推荐）" />
              </H3>
            </div>
            <p className="mt-4 text-sm text-cream/60">In your terminal · 在终端里：</p>
            <div className="mt-2">
              <Code
                label="terminal"
                lines={[
                  "claude plugin marketplace add lemomo-ai/lemo-opuscar",
                  "claude plugin install lemo-opuscar@lemolab",
                ]}
              />
            </div>
            <div className="mt-5 space-y-3 text-sm text-cream/85">
              <p>
                <Bi
                  en={
                    <>
                      Then use it from any folder. On first use it downloads the guides, tools and style prompts (about 30 MB) to{" "}
                      <code className="rounded bg-black px-1.5 py-0.5 font-mono text-gold">~/lemo-opuscar</code>, shared by all your films. Each film's
                      project, from source to finished video, goes in the folder you started from. For other agents, copy{" "}
                      <a
                        className="text-gold hover:underline"
                        href={`${REPO}/blob/main/plugin/skills/lemo-opuscar`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        plugin/skills/lemo-opuscar/
                      </a>{" "}
                      into their skills folder.
                    </>
                  }
                  zh={
                    <>
                      之后在任何目录都能用。第一次使用时，它会把指南、工具和风格提示词（约 30 MB）下载到{" "}
                      <code className="rounded bg-black px-1.5 py-0.5 font-mono text-gold">~/lemo-opuscar</code>
                      ，所有片子共用这一份；每支片子的工程，从源码到成片，都放在你发起时所在的文件夹里。其他 agent 可以把{" "}
                      <a
                        className="text-gold hover:underline"
                        href={`${REPO}/blob/main/plugin/skills/lemo-opuscar`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        plugin/skills/lemo-opuscar/
                      </a>{" "}
                      复制到它们的 skills 目录。
                    </>
                  }
                />
              </p>
            </div>
          </div>

          {/* Option 2 */}
          <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
            <span className="rounded border border-line px-2 py-0.5 text-xs font-bold text-cream/60">DIY</span>
            <div className="mt-4">
              <H3>
                <Bi en="Option 2: clone the repo" zh="方式二：clone 仓库" />
              </H3>
            </div>
            <p className="mt-4 text-sm text-cream/60">In your terminal · 在终端里：</p>
            <div className="mt-2">
              <Code
                label="terminal"
                lines={["git clone https://github.com/lemomo-ai/lemo-opuscar.git", "cd lemo-opuscar", "claude"]}
              />
            </div>
            <p className="mt-5 text-sm text-cream/85">
              <Bi
                en={
                  <>
                    Films go into <code className="rounded bg-black px-1.5 py-0.5 font-mono text-gold">films/&lt;name&gt;/</code> inside the repo.
                  </>
                }
                zh={
                  <>
                    片子做到仓库里的 <code className="rounded bg-black px-1.5 py-0.5 font-mono text-gold">films/&lt;名字&gt;/</code>。
                  </>
                }
              />
            </p>
          </div>
        </div>

        {/* Then just say */}
        <div className="mt-16 grid gap-10 lg:grid-cols-2">
          <div>
            <H3>
              <Bi en="Then just say what you want" zh="然后直接说" />
            </H3>
            <div className="mt-5 space-y-4">
              {prompts.map((p) => (
                <figure key={p.en} className="space-y-3">
                  <blockquote className="rounded-xl border border-line bg-panel p-5 font-display text-lg italic leading-snug text-cream">
                    “{p.en}”
                  </blockquote>
                  <blockquote className="rounded-xl border border-line bg-panel p-5 font-display text-lg leading-snug text-cream">
                    “{p.zh}”
                  </blockquote>
                </figure>
              ))}
            </div>
            <p className="mt-5 text-sm text-cream/80">
              <Bi
                en={
                  <>
                    Name the style in English or Chinese; the{" "}
                    <a href="#styles" className="text-gold hover:underline">
                      style index
                    </a>{" "}
                    lists them all.
                  </>
                }
                zh={
                  <>
                    风格用英文名或中文名都行，全部风格见
                    <a href="#styles" className="text-gold hover:underline">
                      风格索引
                    </a>
                    。
                  </>
                }
              />
            </p>
          </div>

          <div>
            <H3>
              <Bi en="It asks you once, up front" zh="它开工前只问你一次" />
            </H3>
            <ol className="mt-5 space-y-3">
              {[
                {
                  en: "Anything it can't decide about your topic",
                  zh: "主题里它定不了的事",
                },
                {
                  en: "Whether you have your own voice, music or other material",
                  zh: "你有没有自己的配音、音乐或其他素材",
                },
                {
                  en: "Whether you want to see a storyboard first",
                  zh: "要不要先看分镜故事板",
                },
              ].map((q, i) => (
                <li key={i} className="flex gap-4 rounded-xl border border-line bg-panel p-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold font-display font-bold text-black">
                    {i + 1}
                  </span>
                  <Bi en={q.en} zh={q.zh} />
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm text-cream/80">
              <Bi
                en="Say yes and it stops once to show you the key shots in the real style; otherwise it goes straight to the finished film."
                zh="要看的话，它会停一次，给你看用真实风格画出来的关键镜头；不看就直接做完成片。"
              />
            </p>
          </div>
        </div>

        {/* Guides */}
        <div className="mt-16">
          <H3>
            <Bi en="The agent reads three guides and works like a small studio" zh="agent 会读三份指南，像一个小工作室一样开工" />
          </H3>
          <div className="mt-6 overflow-hidden rounded-2xl border border-line">
            <div className="grid grid-cols-3 bg-panel px-5 py-3 text-xs font-semibold uppercase tracking-wider text-cream/50 max-sm:hidden">
              <div>File · 文件</div>
              <div className="col-span-2">What it gives the agent · 给 agent 的东西</div>
            </div>
            {[
              {
                file: "DIRECTOR.md",
                href: `${REPO}/blob/main/DIRECTOR.md`,
                en: "how to direct: story, sound, rhythm, camera, performance, self-checks",
                zh: "怎么导：故事、声音、节奏、镜头、表演、自检",
                icon: "🎬",
              },
              {
                file: "TECHNIQUE.md",
                href: `${REPO}/blob/main/TECHNIQUE.md`,
                en: "how to build: frame-by-frame rendering, voice, music, mixing",
                zh: "怎么做：逐帧渲染、配音、配乐、混音",
                icon: "🛠️",
              },
              {
                file: "styles/<style>/STYLE.md",
                href: "#styles",
                en: "what the style looks and sounds like; the story is yours",
                zh: "这个风格长什么样、听起来什么样；故事由你定",
                icon: "🎨",
              },
            ].map((g) => (
              <div key={g.file} className="grid items-center gap-2 border-t border-line px-5 py-4 sm:grid-cols-3">
                <a
                  href={g.href}
                  target={g.href.startsWith("#") ? undefined : "_blank"}
                  rel="noreferrer"
                  className="font-mono text-sm text-gold hover:underline"
                >
                  {g.icon} {g.file}
                </a>
                <div className="text-sm text-cream/85 sm:col-span-2">
                  <Bi en={g.en} zh={g.zh} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Before you start + update */}
        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
            <H3>
              <Bi en="Before you start" zh="开始之前" />
            </H3>
            <ul className="mt-5 space-y-4 text-sm">
              {[
                {
                  i: "⏱️",
                  en: "A film takes an agent about 30–60 minutes and a fair amount of tokens.",
                  zh: "一支片子 agent 大约要做 30–60 分钟，token 用量不小。",
                },
                {
                  i: "🧰",
                  en: "You need Node 20+, ffmpeg and Python 3.11+ (or uv); the agent installs the rest.",
                  zh: "需要 Node 20+、ffmpeg 和 Python 3.11+（或 uv），其余由 agent 安装。",
                },
                {
                  i: "💾",
                  en: "Disk: about 350 MB for the core tools, more only when a film needs a voice or sampled instruments. Default output 1920×1080, 24 fps; other sizes on request.",
                  zh: "磁盘：核心工具约 350 MB，片子需要配音或采样乐器时才再下载。默认 1920×1080、24 fps，其他尺寸可以指定。",
                },
              ].map((x) => (
                <li key={x.en} className="flex gap-3">
                  <span className="text-xl">{x.i}</span>
                  <Bi en={x.en} zh={x.zh} />
                </li>
              ))}
            </ul>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
              {[
                ["Node 20+", "runtime"],
                ["ffmpeg", "encode"],
                ["Python 3.11+", "or uv"],
              ].map(([a, b]) => (
                <div key={a} className="rounded-lg border border-line bg-black px-2 py-3">
                  <div className="font-mono text-sm text-gold">{a}</div>
                  <div className="text-cream/50">{b}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
              {[
                ["1920×1080", "default size"],
                ["24 fps", "default rate"],
                ["~350 MB", "core tools"],
              ].map(([a, b]) => (
                <div key={a} className="rounded-lg border border-line bg-black px-2 py-3">
                  <div className="font-mono text-sm text-cream">{a}</div>
                  <div className="text-cream/50">{b}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
            <H3>
              <Bi en="Update & uninstall" zh="更新与卸载" />
            </H3>
            <p className="mt-5 text-sm text-cream/60">Update · 更新：</p>
            <div className="mt-2">
              <Code
                lines={[
                  "claude plugin marketplace update lemolab && claude plugin update lemo-opuscar@lemolab",
                ]}
              />
            </div>
            <p className="mt-3 text-sm text-cream/80">
              <Bi
                en="Then restart Claude Code (the library in ~/lemo-opuscar updates itself on the next film)."
                zh="然后重启 Claude Code（~/lemo-opuscar 里的库会在下一次做片时自动更新）。"
              />
            </p>
            <p className="mt-5 text-sm text-cream/60">Uninstall · 卸载：</p>
            <div className="mt-2">
              <Code lines={["claude plugin uninstall lemo-opuscar@lemolab", "rm -rf ~/lemo-opuscar"]} />
            </div>
            <p className="mt-3 text-sm text-cream/80">
              <Bi
                en={
                  <>
                    If a step stays stuck,{" "}
                    <a className="text-gold hover:underline" href={`${REPO}/issues`} target="_blank" rel="noreferrer">
                      open an issue
                    </a>
                    .
                  </>
                }
                zh={
                  <>
                    一直卡住就
                    <a className="text-gold hover:underline" href={`${REPO}/issues`} target="_blank" rel="noreferrer">
                      提个 issue
                    </a>
                    。
                  </>
                }
              />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
