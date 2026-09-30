import type { CameraDef } from "../types";
import { Coil, Gear, Iris, Knurl, LensGlass, Screw, Spiral, T } from "./kit";

const VY = 280; // viewing lens centre y
const TY = 404; // taking lens centre y
const X = 500;

const hole = (cx: number, cy: number, r: number) => `M${cx + r} ${cy}a${r} ${r} 0 1 0 ${-2 * r} 0a${r} ${r} 0 1 0 ${2 * r} 0Z`;

export const tlr: CameraDef = {
  id: "tlr",
  no: "02",
  name: "The Twin-Lens Reflex",
  model: "MERIDIAN REFLEX 6×6",
  year: "1954",
  kind: "120 medium format · waist-level",
  tagline: "Two lenses, one mirror — you look down, it looks forward.",
  story:
    "The upper lens is only for looking. The lower lens is only for taking. They're geared together so that when one is sharp the other is too — a beautiful piece of German-style overengineering.",
  accent: "#6fd3c0",
  glow: "rgba(111,211,192,.15)",
  stats: [
    ["Format", "120 · 6×6 cm"],
    ["Lens", "75mm f/3.5 Tessar-type"],
    ["Parts in view", "14"],
  ],
  rebuild: {
    skeleton: "Bones first: the big casting, then the lens board that floats on its rails. Two openings, one for seeing and one for taking.",
    muscle: "Muscle next: the mirror, the leaf shutter, both sets of glass, the focusing rack and the film spools slide into place.",
    skin: "Skin last: crackle-black leather, the hood and the two ringed bezels. Only the crank and the focus knob stay outside to be touched.",
  },
  parts: [
    /* ── skeleton ── */
    {
      id: "casting",
      name: "Main casting",
      layer: "skeleton",
      cx: X,
      cy: 356,
      w: 138,
      h: 246,
      ps: 0.62,
      blurb: "A hollow aluminium box, machined inside and out — lightproof, rigid and surprisingly light.",
      detail:
        "The upper chamber is for viewing, the lower for the film. A horizontal partition inside stops the two compartments leaking light into each other. Hinge bosses at the top carry the folding hood.",
      specs: [
        ["Material", "Cast aluminium"],
        ["Weight", "≈ 310 g bare"],
        ["Chambers", "2, light-trapped"],
      ],
      render: () => (
        <g>
          <rect x="362" y="110" width="276" height="492" rx="18" fill="url(#gDarkH)" stroke="#000" strokeWidth="1.6" />
          <rect x="370" y="118" width="260" height="476" rx="12" fill="none" stroke="rgba(255,255,255,.14)" />
          <circle cx={X} cy={VY} r="62" fill="#050506" stroke="#6a6a70" strokeWidth="1.4" />
          <circle cx={X} cy={TY} r="72" fill="#050506" stroke="#6a6a70" strokeWidth="1.4" />
          <rect x="380" y="340" width="240" height="6" fill="#1b1b1f" stroke="rgba(255,255,255,.15)" />
          <rect x="392" y="478" width="216" height="104" rx="6" fill="#0a0a0c" stroke="rgba(255,255,255,.18)" />
          {[404, 420, 436].map((y) => (
            <line key={y} x1="398" x2="602" y1={y + 72} y2={y + 72} stroke="rgba(255,255,255,.07)" />
          ))}
          <rect x="392" y="478" width="8" height="104" fill="#26262a" />
          <rect x="600" y="478" width="8" height="104" fill="#26262a" />
          {[
            [386, 140],
            [614, 140],
            [382, 590],
            [618, 590],
            [382, 330],
            [618, 330],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="9" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.25)" />
              <Screw x={x} y={y} r={4} a={i * 41} />
            </g>
          ))}
          <T x={X} y={126} s={6.4} fill="#8a8a90" ls={2}>CASTING Nº 552A · AL-SI</T>
        </g>
      ),
    },
    {
      id: "lensboard",
      name: "Lens board",
      layer: "skeleton",
      cx: X,
      cy: 342,
      w: 80,
      h: 132,
      ps: 0.98,
      z: 7.5,
      blurb: "One brass-screwed plate carries both lenses, so they always focus together.",
      detail:
        "Rack-and-pinion slides the whole board forward and back on rails. Because viewing and taking lens are on the same plate, what's sharp on your ground glass is sharp on the film — no parallax-of-focus.",
      specs: [
        ["Travel", "18 mm"],
        ["Rails", "2 × hardened steel"],
        ["Finish", "Satin nickel"],
      ],
      render: () => (
        <g>
          <path
            fillRule="evenodd"
            d={`M420 210H580V474H420Z ${hole(X, VY, 48)} ${hole(X, TY, 56)}`}
            fill="url(#gMetalH)"
            stroke="#333"
            strokeWidth="1.4"
          />
          {Array.from({ length: 28 }).map((_, i) => (
            <line key={i} x1="424" x2="576" y1={216 + i * 9.2} y2={216 + i * 9.2} stroke="rgba(0,0,0,.07)" />
          ))}
          <rect x="424" y="214" width="9" height="256" fill="url(#gDark)" />
          <rect x="567" y="214" width="9" height="256" fill="url(#gDark)" />
          {[
            [428, 222],
            [572, 222],
            [428, 462],
            [572, 462],
            [428, 342],
            [572, 342],
          ].map(([x, y], i) => (
            <Screw key={i} x={x} y={y} r={3.2} a={i * 50} />
          ))}
          <T x={X} y={340} s={6} fill="#2a2a2c" ls={1.4} w={700}>∞ · 10 · 6 · 4 · 3 · 2.5 · 2 · 1.5 m</T>
          <T x={X} y={348} s={4.4} fill="#555" ls={1.6}>FOCUS SCALE</T>
        </g>
      ),
    },

    /* ── muscle ── */
    {
      id: "mirror",
      name: "Reflex mirror",
      layer: "muscle",
      cx: X,
      cy: 342,
      w: 62,
      h: 52,
      ps: 1.2,
      blurb: "A fixed mirror at 45° that folds the viewing lens's image up onto the ground glass.",
      detail:
        "Unlike an SLR's mirror, this one never moves — the taking lens is a separate lens, so the mirror doesn't have to get out of the way. That's why there's no blackout and almost no vibration.",
      specs: [
        ["Angle", "45° fixed"],
        ["Surface", "Front-surface Al"],
        ["Image", "Reversed L↔R"],
      ],
      render: () => (
        <g>
          <rect x="436" y="290" width="128" height="104" rx="5" fill="#0b0b0d" stroke="#666" />
          <rect x="442" y="296" width="116" height="92" rx="3" fill="url(#gMirror)" />
          <path d="M442 388L558 296" stroke="#fff" strokeOpacity=".55" strokeWidth="7" />
          <path d="M442 350L520 296" stroke="#fff" strokeOpacity=".25" strokeWidth="3" />
          <rect x="430" y="384" width="140" height="8" rx="4" fill="url(#gBrass)" stroke="#5b4214" />
          <path d="M458 284L458 264M458 264l-4 8M458 264l4 8M542 264L542 284M542 284l-4 -8M542 284l4 -8" stroke="#6fd3c0" strokeWidth="1.3" fill="none" />
          <T x={X} y={404} s={5.5} fill="#8fa3b1" ls={1.4}>45° · FIXED</T>
        </g>
      ),
    },
    {
      id: "shutter",
      name: "Leaf shutter",
      layer: "muscle",
      cx: X,
      cy: TY,
      w: 60,
      h: 60,
      ps: 1.2,
      dyn: true,
      blurb: "Five metal leaves inside the lens itself. They flash open in a blink — and sync with flash at every speed.",
      detail:
        "A spring-loaded ring drives all five blades at once from the centre outward. Because the whole frame is exposed simultaneously, flash works at every speed — a real advantage over focal-plane shutters.",
      specs: [
        ["Blades", "5"],
        ["Speeds", "1 s – 1/500"],
        ["Flash sync", "All speeds"],
      ],
      render: ({ pulse, spin }) => (
        <g>
          <circle cx={X} cy={TY} r="60" fill="url(#gChrome)" stroke="#333" />
          <Iris cx={X} cy={TY} R={48} a={6 + pulse * 28} n={5} rot={pulse * 16} />
          <Gear cx={X + 46} cy={TY + 34} r={13} n={12} rot={spin * 2} holes={3} />
          <Gear cx={X - 48} cy={TY + 26} r={10} n={10} rot={-spin * 2.4} holes={3} />
          <path d={`M${X - 54} ${TY - 30}L${X - 30} ${TY - 52}`} stroke="#555" strokeWidth="6" strokeLinecap="round" />
          <circle cx={X - 54} cy={TY - 30} r="4.5" fill="#d33" />
          <Spiral cx={X + 40} cy={TY - 38} r={10} turns={3} color="#555" />
          <T x={X} y={TY + 72} s={5.5} fill="#8a8a8e" ls={1.4}>B·1·2·4·8·15·30·60·125·250·500</T>
        </g>
      ),
    },
    {
      id: "viewopt",
      name: "Viewing optics",
      layer: "muscle",
      cx: X,
      cy: VY,
      w: 48,
      h: 48,
      ps: 1.45,
      dyn: true,
      blurb: "A three-element lens that does nothing but show you the world, bright and big, on the ground glass.",
      detail:
        "It has a faster aperture than the taking lens — f/2.8 against f/3.5 — so your finder stays bright even when the film is being exposed in dim light. It's not trying to be perfect, just helpful.",
      specs: [
        ["Elements", "3"],
        ["Aperture", "f/2.8 fixed"],
        ["Focal length", "75 mm"],
      ],
      render: ({ spin }) => (
        <g>
          <LensGlass cx={X} cy={VY} r={48} rot={spin * 0.04} />
          <Knurl cx={X} cy={VY} r={46} w={3} dash="1 2" c="#888" o={0.6} />
        </g>
      ),
    },
    {
      id: "takeopt",
      name: "Taking optics",
      layer: "muscle",
      cx: X,
      cy: TY,
      w: 56,
      h: 56,
      ps: 1.3,
      dyn: true,
      blurb: "A four-element Tessar-type lens. It draws the picture you'll actually keep.",
      detail:
        "Tessar designs put four elements in three groups, cemented in the rear pair. The design is over a century old and still resolves more than film can record — the magic is in the glass, not the electronics.",
      specs: [
        ["Elements", "4 in 3 groups"],
        ["Aperture", "f/3.5 – f/22"],
        ["Coating", "T* style"],
      ],
      render: ({ spin }) => (
        <g>
          <LensGlass cx={X} cy={TY} r={56} rot={-spin * 0.05} />
          <path d={`M${X - 40} ${TY}A40 40 0 0 0 ${X + 40} ${TY}`} stroke="#9fd8ff" strokeOpacity=".3" fill="none" />
          <Knurl cx={X} cy={TY} r={54} w={3} dash="1 2" c="#888" o={0.6} />
        </g>
      ),
    },
    {
      id: "rack",
      name: "Focus rack & pinion",
      layer: "muscle",
      cx: 402,
      cy: 344,
      w: 34,
      h: 58,
      ps: 1.9,
      dyn: true,
      blurb: "A tiny brass pinion bites a rack on the lens board. Turn the knob, the whole board glides.",
      detail:
        "This is the heart of the TLR's coupled focusing: one pinion, one rack, two lenses. The teeth are cut at a fine pitch so a quarter-turn moves the board a millimetre, for precise focus.",
      specs: [
        ["Pinion", "12 teeth"],
        ["Rack", "Brass, 0.5 mod"],
        ["Ratio", "1 mm / 90°"],
      ],
      render: ({ spin }) => (
        <g>
          <rect x="404" y="290" width="24" height="108" rx="3" fill="url(#gMetalH)" stroke="#444" />
          {Array.from({ length: 13 }).map((_, i) => (
            <path key={i} d={`M404 ${294 + i * 8}l-7 3v3l7 2Z`} fill="url(#gBrass)" stroke="#5b4214" strokeWidth=".6" />
          ))}
          <Gear cx={385} cy={344} r={22} n={12} rot={spin * 1.5} />
          <Coil x={372} y={394} w={44} h={6} n={7} color="#999" />
        </g>
      ),
    },
    {
      id: "spools",
      name: "Film spools",
      layer: "muscle",
      cx: X,
      cy: 528,
      w: 82,
      h: 40,
      ps: 1.3,
      blurb: "Two steel spools: one feeds the film paper, one catches it. A red window on the back shows the frame numbers.",
      detail:
        "120 film is wound with a paper backing that blocks light. As you crank, numbers printed on the paper scroll past a red window until the next frame is centred. Twelve turns and it's ready.",
      specs: [
        ["Film", "120 roll"],
        ["Frames", "12 × 6×6"],
        ["Window", "Red acetate"],
      ],
      render: () => (
        <g>
          {/* supply */}
          <rect x="414" y="490" width="58" height="80" rx="3" fill="#0b0b0b" stroke="#333" />
          <rect x="420" y="496" width="46" height="68" fill="#151515" />
          <rect x="414" y="488" width="58" height="6" rx="2" fill="url(#gMetal)" stroke="#444" />
          <rect x="414" y="566" width="58" height="6" rx="2" fill="url(#gMetal)" stroke="#444" />
          <rect x="438" y="480" width="10" height="10" fill="#ccc" />
          <rect x="420" y="496" width="8" height="68" fill="rgba(255,255,255,.12)" />
          {/* take-up */}
          <rect x="528" y="490" width="58" height="80" rx="3" fill="#1c1c1f" stroke="#333" />
          <rect x="548" y="494" width="18" height="72" fill="url(#gMetalH)" stroke="#444" />
          <rect x="528" y="488" width="58" height="6" rx="2" fill="url(#gMetal)" stroke="#444" />
          <rect x="528" y="566" width="58" height="6" rx="2" fill="url(#gMetal)" stroke="#444" />
          <rect x="552" y="480" width="10" height="10" fill="#ccc" />
          <path d="M557 500H472" stroke="#1d1d1d" strokeWidth="14" />
          <path d="M472 500H528" stroke="#222" strokeWidth="14" />
          {[1, 2, 3, 4].map((n) => (
            <T key={n} x={474 + n * 10} y={503} s={7} fill="#d94b3a" w={700}>{n}</T>
          ))}
          <T x={X} y={585} s={5.5} fill="#8a8a90" ls={1.5}>120 · 12 EXP · 6×6</T>
        </g>
      ),
    },

    /* ── skin ── */
    {
      id: "leather",
      name: "Leather body",
      layer: "skin",
      cx: X,
      cy: 388,
      w: 132,
      h: 202,
      ps: 0.85,
      blurb: "Black leather glued over the casting, with a cut-out for the lens board and a nameplate.",
      detail:
        "Traditionally real calfskin, pressed with a fine grain. It protects the aluminium from dents and stops the camera sliding about on a wet bench. The engraved plate says what it is.",
      specs: [
        ["Material", "Pressed calfskin"],
        ["Stitch", "Hand-edged"],
        ["Nameplate", "Nickel"],
      ],
      render: () => (
        <g>
          <path
            fillRule="evenodd"
            d="M368 186H632V590H368Z M412 208H588V478H412Z"
            fill="url(#pLeather)"
            stroke="#000"
            strokeWidth="1.6"
          />
          <path fillRule="evenodd" d="M375 193H625V583H375Z M405 201H595V485H405Z" fill="none" stroke="#7a7a7e" strokeDasharray="4 3" />
          <rect x="430" y="514" width="140" height="44" rx="4" fill="url(#gChrome)" stroke="#2a2a2c" />
          <rect x="434" y="518" width="132" height="36" rx="2" fill="none" stroke="rgba(0,0,0,.35)" />
          <T x={X} y={534} s={11} fill="#1b1b1d" w={800} ls={2.6} f="Inter, sans-serif">MERIDIAN</T>
          <T x={X} y={547} s={6} fill="#333" ls={2.2}>REFLEX · 6×6 · f/3.5</T>
          <circle cx="400" cy="536" r="5" fill="#0a0a0a" stroke="#888" />
          <circle cx="600" cy="536" r="5" fill="#0a0a0a" stroke="#888" />
        </g>
      ),
    },
    {
      id: "hood",
      name: "Hood & finder cover",
      layer: "skin",
      cx: X,
      cy: 151,
      w: 134,
      h: 40,
      ps: 0.85,
      blurb: "Fold the top open and it becomes a hood that shades the ground glass; fold it flat and it's a sport finder.",
      detail:
        "Four hinged panels of sheet steel, sprung so they stand up without fiddling. A tiny lens in the front flap becomes a magnifier for critical focus — lift it, lean in, rock the focus knob until the grain pops.",
      specs: [
        ["Panels", "4 hinged"],
        ["Magnifier", "×5 lens"],
        ["Finish", "Black crackle"],
      ],
      render: () => (
        <g>
          <rect x="366" y="112" width="268" height="78" rx="12" fill="url(#pGrip)" stroke="#000" strokeWidth="1.5" />
          <rect x="366" y="112" width="268" height="14" rx="8" fill="url(#gChrome)" stroke="#333" />
          <rect x="386" y="132" width="228" height="52" rx="6" fill="#0d0d0e" stroke="#555" />
          <rect x="450" y="142" width="100" height="32" rx="3" fill="url(#gGlass)" stroke="#ccc" />
          <path d="M456 168L500 146L544 168" stroke="#fff" strokeOpacity=".25" fill="none" />
          <rect x="450" y="142" width="100" height="10" fill="url(#gGloss)" />
          {[-1, 1].map((d) => (
            <g key={d}>
              <rect x={d < 0 ? 372 : 608} y="138" width="20" height="40" rx="4" fill="url(#gChrome)" stroke="#333" />
              <Screw x={d < 0 ? 382 : 618} y={148} r={3} a={d * 30} />
              <Screw x={d < 0 ? 382 : 618} y={168} r={3} a={d * 60} />
            </g>
          ))}
          <circle cx="596" cy="158" r="7" fill="url(#gBtnRed)" stroke="#000" />
          <T x={X} y={122} s={6.5} fill="#2a2a2c" ls={3} w={800}>MERIDIAN REFLEX</T>
          <T x={420} y={162} s={5} fill="#777" ls={1.4}>FINDER</T>
        </g>
      ),
    },
    {
      id: "takebezel",
      name: "Taking-lens bezel",
      layer: "skin",
      cx: X,
      cy: TY,
      w: 64,
      h: 64,
      ps: 1.05,
      dyn: true,
      blurb: "The shutter-speed ring, aperture ring and f-stop scale, all crammed into a chrome collar.",
      detail:
        "Two rings, two jobs. The outer knurled ring sets shutter speed; the inner scale sets aperture. Since it's a leaf shutter, you can change speed without cocking — just don't do it mid-exposure.",
      specs: [
        ["Scale rings", "2"],
        ["Apertures", "f/3.5–f/22"],
        ["Click-stops", "1 stop"],
      ],
      render: ({ spin }) => (
        <g>
          <circle cx={X} cy={TY} r="51" fill="none" stroke="url(#gChrome)" strokeWidth="26" />
          <circle cx={X} cy={TY} r="60" fill="none" stroke="url(#pKnurlD)" strokeWidth="8" />
          <g transform={`rotate(${spin * 0.03} ${X} ${TY})`}>
            <Knurl cx={X} cy={TY} r={60} w={5} dash="1.4 2" c="#999" o={0.5} />
          </g>
          <circle cx={X} cy={TY} r="64" fill="none" stroke="#000" strokeWidth="1.3" />
          <circle cx={X} cy={TY} r="40" fill="none" stroke="#0a0a0b" strokeWidth="6" />
          <path id="tlr-ap" d={hole(X, TY, 51)} fill="none" />
          <text fontSize="6.2" fontFamily="JetBrains Mono, monospace" fill="#111" fontWeight="700" letterSpacing="1.4">
            <textPath href="#tlr-ap" startOffset="6">3.5 4 5.6 8 11 16 22 ◂ ▸ B 1 2 4 8 15 30 60 125 250 500</textPath>
          </text>
          <circle cx={X} cy={TY - 60} r="3" fill="#d22" />
        </g>
      ),
    },
    {
      id: "viewbezel",
      name: "Viewing-lens bezel",
      layer: "skin",
      cx: X,
      cy: VY,
      w: 58,
      h: 58,
      ps: 1.15,
      blurb: "A matte black ring engraved with the lens name and speed. The shorter the barrel, the less it gets in the way.",
      detail:
        "The viewing lens is fixed, so its bezel is pure cosmetics and thread: it carries filters and a bayonet for lens hoods. Brand, focal length and serial number are laser-engraved and filled with white.",
      specs: [
        ["Bayonet", "Series VI"],
        ["Engraving", "Laser, filled"],
        ["Finish", "Black anodised"],
      ],
      render: () => (
        <g>
          <circle cx={X} cy={VY} r="47" fill="none" stroke="url(#gDark)" strokeWidth="22" />
          <circle cx={X} cy={VY} r="58" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1.3" />
          <circle cx={X} cy={VY} r="36" fill="none" stroke="url(#gChrome)" strokeWidth="3" />
          <Knurl cx={X} cy={VY} r={52} w={6} dash="1.6 2.6" c="#777" o={0.45} />
          <path id="tlr-vw" d={hole(X, VY, 46)} fill="none" />
          <text fontSize="6.3" fontFamily="JetBrains Mono, monospace" fill="#ddd" fontWeight="700" letterSpacing="1.3">
            <textPath href="#tlr-vw" startOffset="4">MERIDIAN HELIOSTAR 1:2.8 f=75mm · Nº 2290184 ·</textPath>
          </text>
          <circle cx={X - 38} cy={VY - 38} r="2.2" fill="#fff" />
        </g>
      ),
    },
    {
      id: "crank",
      name: "Film crank",
      layer: "skin",
      cx: 666,
      cy: 384,
      w: 34,
      h: 34,
      ps: 1.9,
      dyn: true,
      blurb: "Fold out the crank and wind. A click tells you a new frame is ready and the shutter is cocked.",
      detail:
        "Inside, a worm drive turns the take-up spool while a feeler wheel counts the frame. Wind too fast and the little ratchet stops you — it saves you from double-exposures.",
      specs: [
        ["Drive", "Worm + wheel"],
        ["Stop", "Auto ratchet"],
        ["Turns / frame", "≈ 2.5"],
      ],
      render: ({ spin }) => (
        <g>
          <rect x="632" y="350" width="18" height="68" rx="5" fill="url(#gChrome)" stroke="#333" />
          <g transform={`rotate(${spin * 0.3} 660 384)`}>
            <rect x="652" y="379" width="36" height="10" rx="5" fill="url(#gMetalH)" stroke="#333" />
            <circle cx="690" cy="384" r="10" fill="url(#gDark)" stroke="#000" />
            <Knurl cx={690} cy={384} r={8} w={3} dash="1 1.6" c="#999" o={0.7} />
          </g>
          <circle cx="660" cy="384" r="8" fill="url(#gMetalH)" stroke="#333" />
          <Screw x={660} y={384} r={3.5} a={30} />
          <Screw x={641} y={360} r={3} />
          <Screw x={641} y={408} r={3} a={70} />
        </g>
      ),
    },
    {
      id: "knob",
      name: "Focus knob",
      layer: "skin",
      cx: 346,
      cy: 342,
      w: 20,
      h: 54,
      ps: 2.1,
      blurb: "A fat knurled wheel on the left side. Your left thumb lives here.",
      detail:
        "Its broad surface and fine knurl let you make tiny adjustments with a fingertip. A built-in distance scale peeks through a window so you can read feet without looking.",
      specs: [
        ["Diameter", "32 mm"],
        ["Knurl", "Diamond"],
        ["Scale", "Window"],
      ],
      render: () => (
        <g>
          <rect x="360" y="312" width="12" height="60" rx="3" fill="url(#gChrome)" stroke="#333" />
          <rect x="326" y="288" width="36" height="108" rx="16" fill="url(#gMetalH)" stroke="#2c2c2e" strokeWidth="1.3" />
          <rect x="330" y="294" width="28" height="96" rx="12" fill="url(#pKnurl)" opacity=".9" />
          <rect x="326" y="288" width="8" height="108" rx="6" fill="rgba(255,255,255,.35)" />
          <rect x="336" y="326" width="18" height="32" rx="3" fill="#0b0b0b" stroke="#555" />
          <T x={345} y={340} s={6} fill="#ffd27a" w={700}>3</T>
          <T x={345} y={351} s={4.4} fill="#aaa">m</T>
          <rect x="330" y="384" width="28" height="8" rx="4" fill="url(#gBrass)" stroke="#5b4214" />
        </g>
      ),
    },
  ],
};
