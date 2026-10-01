import { useEffect, useState } from 'react';
import Overview from './components/Overview';
import ExplodedView from './components/ExplodedView';
import BuildGuide from './components/BuildGuide';
import Playground from './components/Playground';

type Tab = 'overview' | 'exploded' | 'build' | 'playground';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '🏠' },
  { id: 'exploded', label: 'Exploded view', icon: '🔩' },
  { id: 'build', label: 'Build & set-up', icon: '🛠️' },
  { id: 'playground', label: 'Playground', icon: '🕹️' },
];

function readHash(): { tab: Tab; scenario?: string } {
  const h = window.location.hash.replace('#', '');
  const [t, s] = h.split('/');
  if (TABS.some((x) => x.id === t)) return { tab: t as Tab, scenario: s };
  return { tab: 'overview' };
}

export default function App() {
  const init = readHash();
  const [tab, setTab] = useState<Tab>(init.tab);
  const [scenario, setScenario] = useState<string | undefined>(init.scenario);
  const [buildStep, setBuildStep] = useState(0);

  useEffect(() => {
    const onHash = () => {
      const r = readHash();
      setTab(r.tab);
      setScenario(r.scenario);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (t: Tab, s?: string) => {
    setTab(t);
    setScenario(s);
    window.location.hash = s ? `${t}/${s}` : t;
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased [background-image:radial-gradient(60rem_30rem_at_80%_-10%,rgba(245,158,11,0.10),transparent),radial-gradient(50rem_30rem_at_-10%_10%,rgba(56,189,248,0.07),transparent)]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <button onClick={() => go('overview')} className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-lg shadow-lg shadow-amber-500/20">🦾</span>
            <span className="text-left leading-tight">
              <span className="block text-sm font-bold tracking-tight text-white">SO-101 Robot Lab</span>
              <span className="block text-[11px] text-slate-400">explode · build · simulate</span>
            </span>
          </button>
          <nav className="ml-auto flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${tab === t.id ? 'bg-amber-400 text-slate-900' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
              >
                <span className="mr-1.5">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {tab === 'overview' && <Overview go={(t, s) => go(t, s)} />}
      {tab === 'exploded' && (
        <ExplodedView
          onGoBuild={(step) => {
            setBuildStep(step);
            go('build');
          }}
        />
      )}
      {tab === 'build' && <BuildGuide initialStep={buildStep} />}
      {tab === 'playground' && <Playground initial={scenario} />}

      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
        Unofficial companion for the open-source SO-101 arm by The Robot Studio × Hugging Face LeRobot. Build instructions follow the{' '}
        <a className="text-sky-400 hover:underline" href="https://huggingface.co/docs/lerobot/en/so101" target="_blank" rel="noreferrer">
          official LeRobot guide
        </a>
        .
      </footer>
    </div>
  );
}
