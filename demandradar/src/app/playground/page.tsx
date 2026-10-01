import Playground from "@/components/Playground";

export const metadata = { title: "Scoring playground · Demand Radar" };

export default function PlaygroundPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Scoring playground</h1>
      <p className="mb-8 mt-2 max-w-3xl text-sm text-zinc-400">
        Paste the JSON your agent produced and check the maths the same way the scripts do: triangulation (≥2 independent platforms), repost downgrade, per-dimension gaps, judge medians,
        disagreement, no-data exclusion and the verdict cap. The bundled example is synthetic placeholder data.
      </p>
      <Playground />
    </main>
  );
}
