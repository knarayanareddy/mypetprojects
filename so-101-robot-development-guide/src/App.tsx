import { useCallback, useEffect, useState } from 'react';
import Overview from './components/Overview';
import ExplodedView from './components/ExplodedView';
import BuildGuide from './components/BuildGuide';
import Playground from './components/Playground';
import Models from './components/Models';
import Strategy from './components/Strategy';

const PAGES = [
  { id: 'home', label: 'Overview' },
  { id: 'exploded', label: 'Exploded View' },
  { id: 'build', label: 'Build Guide' },
  { id: 'playground', label: 'Playground' },
  { id: 'models', label: 'AI Models' },
  { id: 'strategy', label: 'Visionary & Strategy' },
];

export default function App() {
  const initial = () => {
    const h = window.location.hash.replace('#', '');
    return PAGES.some((p) => p.id === h) ? h : 'home';
  };
  const [page, setPage] = useState(initial);
  const [opts, setOpts] = useState<{ policy?: string; scenario?: string }>({});
  const [menu, setMenu] = useState(false);

  const go = useCallback((p: string, o: { policy?: string; scenario?: string } = {}) => {
    setPage(p);
    setOpts(o);
    setMenu(false);
    window.location.hash = p;
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const f = () => { const h = window.location.hash.replace('#', ''); if (PAGES.some((p) => p.id === h)) setPage(h); };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);

  return (
    <div className="min-h-screen bg-[#070a11] text-slate-200 antialiased">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070a11]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between px-4 py-2.5">
          <button onClick={() => go('home')} className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 text-sm font-black text-white">101</span>
            <span className="text-left leading-tight"><span className="block text-sm font-bold text-white">SO-101 Lab</span><span className="block text-[10px] text-slate-500">build · simulate · deploy</span></span>
          </button>
          <nav className="hidden gap-1 md:flex">
            {PAGES.map((p) => (
              <button key={p.id} onClick={() => go(p.id)} className={`rounded-lg px-3 py-1.5 text-sm transition ${page === p.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{p.label}</button>
            ))}
          </nav>
          <button onClick={() => setMenu(!menu)} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm md:hidden">{menu ? '✕' : '☰'}</button>
        </div>
        {menu && (
          <div className="border-t border-white/10 px-4 py-2 md:hidden">
            {PAGES.map((p) => <button key={p.id} onClick={() => go(p.id)} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${page === p.id ? 'bg-white/10 text-white' : 'text-slate-300'}`}>{p.label}</button>)}
          </div>
        )}
      </header>
      <main>
        {page === 'home' && <Overview go={go} />}
        {page === 'exploded' && <ExplodedView />}
        {page === 'build' && <BuildGuide go={go} />}
        {page === 'playground' && <Playground key={`${opts.policy ?? ''}-${opts.scenario ?? ''}`} initialPolicy={opts.policy} initialScenario={opts.scenario} />}
        {page === 'models' && <Models go={go} />}
        {page === 'strategy' && <Strategy go={go} />}
      </main>
      <footer className="border-t border-white/10 px-4 py-6 text-center text-xs text-slate-500">
        Unofficial companion for the SO-101 / SO-ARM100 arm (TheRobotStudio × Hugging Face LeRobot). 3-D model and model-performance figures are illustrative approximations – verify on hardware.
      </footer>
    </div>
  );
}
