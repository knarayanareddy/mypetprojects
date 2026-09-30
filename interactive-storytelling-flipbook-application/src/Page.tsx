import { memo } from 'react';
import { Art, GlyphSvg, hashStr } from './Art';
import { TOTAL_SIDES, type Story } from './types';

export const PW = 420;
export const PH = 580;

export const plainTitle = (s: Story) => s.title.replace(/\n/g, ' ');

export const Cover = memo(function Cover({ story }: { story: Story }) {
  const lines = story.title.split('\n');
  return (
    <div
      className="cloth"
      style={{
        width: PW,
        height: PH,
        position: 'relative',
        background: story.cloth,
        color: story.gold,
        overflow: 'hidden',
      }}
    >
      {/* hinge groove */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 40,
          background:
            'linear-gradient(to right, rgba(0,0,0,.45), rgba(0,0,0,.15) 30%, rgba(255,255,255,.1) 46%, rgba(0,0,0,.28) 60%, transparent)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: '26px 26px 26px 52px',
          border: `2px solid ${story.gold}`,
          borderRadius: 4,
          opacity: 0.85,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: '34px 34px 34px 60px',
          border: `1px solid ${story.gold}`,
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 52,
          right: 26,
          top: 60,
          bottom: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'center',
        }}
      >
        <div className="kick gold" style={{ fontSize: 20, opacity: 0.9 }}>
          {story.sub}
        </div>
        <div className="gold" style={{ filter: 'drop-shadow(0 1px 0 rgba(0,0,0,.5))' }}>
          <GlyphSvg name={story.emblem} color={story.gold} size={190} px={2.4} />
        </div>
        <div>
          <div
            className="gold"
            style={{
              fontFamily: 'var(--display)',
              fontSize: 50,
              lineHeight: 0.98,
              letterSpacing: '-0.01em',
            }}
          >
            {lines.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
          <div
            className="gold"
            style={{
              marginTop: 14,
              fontFamily: 'var(--serif)',
              fontSize: 11,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              opacity: 0.85,
            }}
          >
            A Sketchbook · 52 Plates
          </div>
        </div>
      </div>
    </div>
  );
});

export const BackCover = memo(function BackCover({ story }: { story: Story }) {
  return (
    <div
      className="cloth"
      style={{
        width: PW,
        height: PH,
        position: 'relative',
        background: story.cloth,
        color: story.gold,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 40,
          background:
            'linear-gradient(to left, rgba(0,0,0,.45), rgba(0,0,0,.15) 30%, rgba(255,255,255,.1) 46%, rgba(0,0,0,.28) 60%, transparent)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: '26px 52px 26px 26px',
          border: `2px solid ${story.gold}`,
          opacity: 0.85,
          borderRadius: 4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 26,
          right: 52,
          top: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
          textAlign: 'center',
        }}
      >
        <GlyphSvg name={story.emblem} color={story.gold} size={90} px={1.8} />
        <div className="gold" style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 34 }}>
          Fin
        </div>
        <div
          className="gold"
          style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.8, maxWidth: 220, lineHeight: 1.7 }}
        >
          {plainTitle(story)}
        </div>
      </div>
    </div>
  );
});

/** One side of a leaf. n: 0 = front cover, 1..52 = content pages, 53 = back cover. */
export const Page = memo(function Page({ story, n }: { story: Story; n: number }) {
  if (n === 0) return <Cover story={story} />;
  if (n === TOTAL_SIDES - 1) return <BackCover story={story} />;
  const entry = story.pages[n - 1];
  if (!entry) return <div className="paper" style={{ width: PW, height: PH }} />;
  const [kick, title, text, tokens] = entry;
  const seed = hashStr(story.id + ':' + n);
  const variant = n === 1 ? 0 : (seed >>> 4) % 3;
  const isRight = n % 2 === 0;
  const accent = story.cloth;

  const textBlock = (
    <div style={{ textAlign: variant === 2 ? 'center' : 'left', marginTop: variant === 1 ? 0 : 14, marginBottom: variant === 1 ? 14 : 0 }}>
      <div className="kick" style={{ color: accent, opacity: 0.85 }}>
        {kick}
      </div>
      <h2 className="ttl" style={{ color: story.ink }}>
        {title}
      </h2>
      <p
        className={'bodytxt' + (variant === 2 ? '' : ' dropcap')}
        style={{ ['--cap' as string]: accent, textAlign: variant === 2 ? 'center' : 'left' }}
      >
        {text}
      </p>
    </div>
  );

  const art =
    variant === 2 ? (
      <div
        style={{
          width: 226,
          height: 226,
          margin: '6px auto 0',
          borderRadius: '50%',
          overflow: 'hidden',
          border: `1.5px solid ${story.ink}55`,
          boxShadow: 'inset 0 0 26px rgba(120,80,30,.18)',
          flex: 'none',
        }}
      >
        <Art tokens={tokens} seed={seed} pal={story.pal} ink={story.ink} slice />
      </div>
    ) : (
      <div
        style={{
          width: '100%',
          aspectRatio: '400 / 250',
          flex: 'none',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, #000 62%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse at 50% 50%, #000 62%, transparent 100%)',
        }}
      >
        <Art tokens={tokens} seed={seed} pal={story.pal} ink={story.ink} />
      </div>
    );

  const folio = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        flexDirection: isRight ? 'row' : 'row-reverse',
        alignItems: 'baseline',
        marginTop: 'auto',
        paddingTop: 10,
        borderTop: `1px solid ${story.ink}22`,
      }}
    >
      <span className="folio" style={{ opacity: 0.75 }}>
        {plainTitle(story)}
      </span>
      <span className="folio" style={{ fontSize: 16 }}>
        {n}
      </span>
    </div>
  );

  return (
    <div className="paper" style={{ width: PW, height: PH, position: 'relative', overflow: 'hidden', color: story.ink }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: isRight ? '30px 30px 22px 40px' : '30px 40px 22px 30px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {variant === 1 && textBlock}
        {art}
        {variant !== 1 && textBlock}
        {folio}
      </div>
      {/* gutter shading + outer edge */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: isRight
            ? 'linear-gradient(to right, rgba(70,45,20,.34), rgba(70,45,20,.1) 5%, transparent 13%, transparent 94%, rgba(70,45,20,.08))'
            : 'linear-gradient(to left, rgba(70,45,20,.34), rgba(70,45,20,.1) 5%, transparent 13%, transparent 94%, rgba(70,45,20,.08))',
        }}
      />
    </div>
  );
});
