import type { CameraDef } from "../types";
import { Coil, Gear, Iris, Knurl, LensGlass, Screw, Spiral, T } from "./kit";

const LX = 500;
const LY = 415;

export const slr: CameraDef = {
  id: "slr",
  no: "01",
  name: "The Single-Lens Reflex",
  model: "MERIDIAN SLR-35",
  year: "1976",
  kind: "35mm film · mechanical",
  tagline: "A mirror, a prism and a curtain that blinks in a thousandth of a second.",
  story:
    "All-mechanical, battery optional. Every click you hear is a spring being released in the right order — the SLR is a clockwork machine that happens to draw with light.",
  accent: "#ffb454",
  glow: "rgba(255,180,84,.16)",
  stats: [
    ["Format", "35 mm · 24×36"],
    ["Shutter", "1/1000 – 1 s, B"],
    ["Parts in view", "14"],
  ],
  rebuild: {
    skeleton: "First the bones: a die-cast chassis, the mirror box and the bayonet mount. Nothing moves yet — but everything now has somewhere to live.",
    muscle: "Now the muscle: mirror, curtains, gear train, film, prism and glass. Every moving piece drops into the skeleton it was cut to fit.",
    skin: "Last, the skin — leatherette, chrome and ringed glass. The same machine, now something you'd want to hold.",
  },
  parts: [
    /* ───────────── SKELETON ───────────── */
    {
      id: "chassis",
      name: "Die-cast chassis",
      layer: "skeleton",
      cx: 500,
      cy: 410,
      w: 260,
      h: 110,
      ps: 0.62,
      blurb: "The backbone. A single zinc-aluminium casting that every other part is screwed to.",
      detail:
        "Cast in one piece so the mount, the film plane and the shutter stay parallel to a few microns. Lightening slots cut weight; ribs stop it twisting when you wind the film.",
      specs: [
        ["Material", "Zn-Al die-cast"],
        ["Flatness", "± 0.02 mm"],
        ["Screw bosses", "12"],
      ],
      render: () => (
        <g>
          <rect x="240" y="300" width="520" height="220" rx="12" fill="url(#gDarkH)" stroke="#000" strokeWidth="1.5" />
          <rect x="248" y="308" width="504" height="204" rx="8" fill="none" stroke="rgba(255,255,255,.14)" />
          <rect x="396" y="326" width="208" height="178" rx="8" fill="#060607" stroke="#666" strokeWidth="1.2" />
          {[340, 372, 448, 480].map((y) =>
            [262, 614].map((x) => <rect key={x + "-" + y} x={x} y={y} width="124" height="14" rx="7" fill="#050506" stroke="rgba(255,255,255,.18)" />)
          )}
          {Array.from({ length: 9 }).map((_, i) => (
            <g key={i}>
              <line x1={266 + i * 14} y1="398" x2={280 + i * 14} y2="432" stroke="rgba(255,255,255,.12)" strokeWidth="2" />
              <line x1={618 + i * 14} y1="398" x2={632 + i * 14} y2="432" stroke="rgba(255,255,255,.12)" strokeWidth="2" />
            </g>
          ))}
          {[
            [262, 320],
            [738, 320],
            [262, 500],
            [738, 500],
            [380, 320],
            [620, 320],
            [380, 506],
            [620, 506],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="9" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.2)" />
              <Screw x={x} y={y} r={4.2} a={i * 37} />
            </g>
          ))}
          <T x={262} y={420} s={7} fill="#8a8a90" anchor="start" ls={1.2}>CHASSIS Nº 4471208</T>
          <T x={738} y={420} s={7} fill="#8a8a90" anchor="end" ls={1.2}>Zn-Al · CAST 76/11</T>
        </g>
      ),
    },
    {
      id: "mirrorbox",
      name: "Mirror box",
      layer: "skeleton",
      cx: LX,
      cy: LY,
      w: 100,
      h: 90,
      ps: 0.95,
      blurb: "A light-tight cavity just deep enough for the mirror to swing up into.",
      detail:
        "Flocked in matte black so stray light is absorbed, not bounced onto your film. The grooves at the sides carry the mirror's hinge arms; the baffles kill lens flare.",
      specs: [
        ["Finish", "Black flock"],
        ["Baffles", "4 ribs"],
        ["Flange distance", "44.0 mm"],
      ],
      render: () => (
        <g>
          <rect x="400" y="325" width="200" height="180" rx="8" fill="url(#gDarkH)" stroke="#000" strokeWidth="1.5" />
          <rect x="424" y="348" width="152" height="134" rx="4" fill="#040405" />
          <path d="M400 325L424 348M600 325L576 348M400 505L424 482M600 505L576 482" stroke="#2c2c31" strokeWidth="1.5" />
          {[360, 380, 400].map((y) => (
            <rect key={y} x="424" y={y + 10} width="152" height="3" fill="#15151a" />
          ))}
          <rect x="424" y="348" width="12" height="134" fill="#0d0d10" />
          <rect x="564" y="348" width="12" height="134" fill="#0d0d10" />
          <circle cx={LX} cy={LY} r="70" fill="none" stroke="#3b3b40" strokeWidth="2" strokeDasharray="3 3" />
          <circle cx="438" cy="336" r="5" fill="url(#gBrass)" />
          <circle cx="562" cy="336" r="5" fill="url(#gBrass)" />
          <rect x="470" y="486" width="60" height="6" rx="3" fill="#1d1d20" stroke="#555" />
          <Screw x={412} y={497} r={3.5} />
          <Screw x={588} y={497} r={3.5} a={80} />
        </g>
      ),
    },
    {
      id: "mount",
      name: "Bayonet mount",
      layer: "skeleton",
      cx: LX,
      cy: LY,
      w: 112,
      h: 112,
      ps: 0.72,
      blurb: "Three steel lugs and a spring-loaded pin. Twist a lens a sixth of a turn and it locks dead-true.",
      detail:
        "The mount fixes the lens exactly 44 mm in front of the film. Stainless steel because you'll swap lenses ten thousand times, and it has to bite the same way every time.",
      specs: [
        ["Material", "Stainless 304"],
        ["Lugs", "3 × 120°"],
        ["Throat Ø", "44 mm"],
      ],
      render: () => (
        <g>
          <circle cx={LX} cy={LY} r="112" fill="url(#gChrome)" stroke="#333" strokeWidth="1.5" />
          <circle cx={LX} cy={LY} r="104" fill="none" stroke="rgba(0,0,0,.35)" />
          <circle cx={LX} cy={LY} r="92" fill="#050506" stroke="#222" strokeWidth="2" />
          {[0, 120, 240].map((a) => (
            <g key={a} transform={`rotate(${a + 30} ${LX} ${LY})`}>
              <path d={`M${LX + 76} ${LY - 15}H${LX + 96}V${LY + 15}H${LX + 76}Z`} fill="url(#gMetalH)" stroke="#444" />
              <path d={`M${LX + 76} ${LY - 15}H${LX + 96}`} stroke="#fff" strokeOpacity=".8" />
            </g>
          ))}
          {[45, 135, 225, 315].map((a, i) => (
            <Screw key={a} x={LX + Math.cos((a * Math.PI) / 180) * 101} y={LY + Math.sin((a * Math.PI) / 180) * 101} r={4.5} a={i * 50} />
          ))}
          <circle cx={LX} cy={LY - 98} r="5.5" fill="url(#gBrass)" stroke="#5b4214" />
          <circle cx={LX - 52} cy={LY - 83} r="4" fill="#d8d8d8" />
          <circle cx={LX + 52} cy={LY - 83} r="4" fill="#d22" />
          <T x={LX} y={LY + 108 - 18} s={6} fill="#333" ls={1.4} w={700}>MERIDIAN · BAYONET · 44.0</T>
        </g>
      ),
    },

    /* ───────────── MUSCLE ───────────── */
    {
      id: "mirror",
      name: "Reflex mirror",
      layer: "muscle",
      cx: LX,
      cy: LY,
      w: 62,
      h: 50,
      ps: 1.25,
      blurb: "A 45° mirror that bounces the image up to your eye — then flips out of the way at the instant of exposure.",
      detail:
        "It's the reason you see exactly what the film will see. A small damper catches it on the way up so it doesn't shake the camera — that 'clack' is the mirror hitting its stop.",
      specs: [
        ["Coating", "Front-surface Al"],
        ["Travel", "45° in 18 ms"],
        ["Sub-mirror", "Half-silvered"],
      ],
      render: () => (
        <g>
          <rect x="436" y="364" width="128" height="100" rx="4" fill="#0b0b0d" stroke="#555" />
          <rect x="442" y="370" width="116" height="88" rx="2" fill="url(#gMirror)" />
          <path d="M442 458L558 370" stroke="#fff" strokeOpacity=".5" strokeWidth="6" />
          <path d="M442 424L520 370" stroke="#fff" strokeOpacity=".25" strokeWidth="3" />
          <rect x="478" y="440" width="44" height="18" fill="#c6d3dc" stroke="#6d7d8a" />
          <rect x="478" y="440" width="44" height="18" fill="url(#pFres)" opacity=".25" />
          <rect x="430" y="358" width="22" height="9" rx="4" fill="url(#gBrass)" stroke="#5b4214" />
          <rect x="548" y="358" width="22" height="9" rx="4" fill="url(#gBrass)" stroke="#5b4214" />
          <rect x="566" y="380" width="8" height="42" rx="3" fill="url(#gMetal)" stroke="#444" />
          <Coil x={428} y={390} w={12} h={30} n={1} color="#999" />
          <T x={LX} y={476} s={5.5} fill="#8fa3b1" ls={1.4}>ALUMINIUM · FRONT SURFACE</T>
        </g>
      ),
    },
    {
      id: "shutter",
      name: "Focal-plane shutter",
      layer: "muscle",
      cx: LX,
      cy: LY,
      w: 72,
      h: 60,
      ps: 1.15,
      dyn: true,
      blurb: "Two curtains race across the film. The gap between them is your shutter speed.",
      detail:
        "At 1/1000 s the slit is a sliver a few millimetres wide travelling at ~4 m/s. The first curtain opens, the second follows — slow speeds expose the whole frame at once. Scroll to see the slit breathe.",
      specs: [
        ["Curtains", "Titanium foil"],
        ["Fastest", "1/1000 s"],
        ["X-sync", "1/60 s"],
      ],
      render: ({ pulse }) => {
        const gap = 6 + pulse * 66;
        const half = (86 - gap) / 2;
        return (
          <g>
            <rect x="428" y="358" width="144" height="114" rx="6" fill="url(#gBrass)" stroke="#4a3810" strokeWidth="1.5" />
            <rect x="442" y="370" width="116" height="90" rx="2" fill="#f1ece0" />
            <rect x="444" y="372" width="112" height={half} fill="url(#pSlat)" />
            <rect x="444" y={458 - half} width="112" height={half} fill="url(#pSlat)" />
            <rect x="444" y={372 + half - 2} width="112" height="3" fill="#888" />
            <rect x="444" y={458 - half - 1} width="112" height="3" fill="#888" />
            <circle cx="436" cy="415" r="6" fill="url(#gMetalH)" stroke="#333" />
            <circle cx="564" cy="415" r="6" fill="url(#gMetalH)" stroke="#333" />
            <rect x="432" y="362" width="136" height="3" fill="rgba(255,255,255,.4)" />
            <Screw x={436} y={364} r={3} />
            <Screw x={564} y={364} r={3} a={70} />
            <Screw x={436} y={466} r={3} a={40} />
            <Screw x={564} y={466} r={3} a={120} />
            <T x={LX} y={484} s={6} fill="#b79a54" ls={1.6}>1/1000 · 1/500 · 1/250 · 1/125</T>
          </g>
        );
      },
    },
    {
      id: "advance",
      name: "Advance gear train",
      layer: "muscle",
      cx: 329,
      cy: 423,
      w: 58,
      h: 66,
      ps: 1.25,
      dyn: true,
      blurb: "Brass gears and a coiled spring that drag the film forward one frame and re-cock the shutter in a single stroke.",
      detail:
        "Flick the lever and three things happen: film moves 38 mm, the frame counter ticks, and the shutter spring is wound. It's all one stroke — the gears are cut so they can't wind half a frame.",
      specs: [
        ["Gears", "3 + ratchet"],
        ["Film pitch", "38 mm"],
        ["Material", "Brass C2680"],
      ],
      render: ({ spin }) => (
        <g>
          <Gear cx={310} cy={396} r={36} n={18} rot={spin} />
          <Gear cx={357.5} cy={429} r={26} n={13} rot={-spin * (36 / 26) + 7} fill="url(#gMetalH)" stroke="#444" />
          <Gear cx={350} cy={469} r={18} n={9} rot={spin * (36 / 18) + 10} />
          <g>
            <circle cx={296} cy={466} r={22} fill="#1d1d20" stroke="#666" />
            <Spiral cx={296} cy={466} r={19} turns={5} />
            <circle cx={296} cy={466} r={3} fill="#ddd" />
          </g>
          <path d="M276 362L316 350" stroke="#777" strokeWidth="5" strokeLinecap="round" />
          <circle cx={316} cy={350} r="4" fill="#bbb" />
        </g>
      ),
    },
    {
      id: "cassette",
      name: "Film cassette",
      layer: "muscle",
      cx: 688,
      cy: 410,
      w: 42,
      h: 72,
      ps: 1.3,
      blurb: "36 frames of silver halide, rolled onto a spool inside a light-tight steel can.",
      detail:
        "The tongue of film pokes out of a felt-lined slot. When you rewind, the whole strip is pulled back into the can so you can open the camera in daylight. The black-and-white squares are a DX code — the camera reads your film speed from them.",
      specs: [
        ["Film", "ISO 400 · 36 exp"],
        ["Spool", "Ø 7 mm"],
        ["Perfs", "8 per frame"],
      ],
      render: () => (
        <g>
          <rect x="648" y="350" width="60" height="132" rx="6" fill="url(#gMetalH)" stroke="#333" strokeWidth="1.3" />
          <rect x="666" y="336" width="24" height="16" rx="3" fill="url(#gMetal)" stroke="#444" />
          <rect x="674" y="326" width="8" height="12" fill="#ccc" stroke="#555" />
          <rect x="648" y="350" width="60" height="10" fill="#b82a1a" opacity=".9" />
          <rect x="648" y="472" width="60" height="10" fill="#b82a1a" opacity=".9" />
          <rect x="658" y="380" width="40" height="60" fill="#f2b233" stroke="#b97a10" />
          <T x={678} y={398} s={8} fill="#b0180f" w={800} ls={0.4}>MERIDIAN</T>
          <T x={678} y={412} s={10} fill="#111" w={800}>400</T>
          <T x={678} y={426} s={5} fill="#111" ls={0.6}>36 EXP · DX</T>
          <T x={678} y={436} s={4.5} fill="#3a2a0a" ls={0.6}>35mm COLOUR</T>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={652 + i * 8} y="449" width="6" height="6" fill={i % 2 ? "#eee" : "#111"} />
          ))}
          <path d="M708 466H740V478H708Z" fill="url(#gFilm)" stroke="#6b3c08" />
          {Array.from({ length: 5 }).map((_, i) => (
            <rect key={i} x={712 + i * 6} y="468" width="3" height="2.5" fill="#1a0f05" />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <rect key={i} x={712 + i * 6} y="474" width="3" height="2.5" fill="#1a0f05" />
          ))}
          <rect x="648" y="350" width="8" height="132" fill="rgba(255,255,255,.25)" />
        </g>
      ),
    },
    {
      id: "prism",
      name: "Pentaprism",
      layer: "muscle",
      cx: 500,
      cy: 262,
      w: 82,
      h: 42,
      ps: 1.25,
      blurb: "A five-sided glass block that turns the mirror's upside-down, back-to-front image right way round.",
      detail:
        "Light enters from the ground-glass screen, bounces twice inside the glass by total internal reflection, then leaves through the eyepiece. A tiny CdS cell beside it reads the light level for the meter.",
      specs: [
        ["Glass", "BK7, silvered"],
        ["Coverage", "92 %"],
        ["Meter", "CdS cell"],
      ],
      render: () => (
        <g>
          <path d="M428 298L450 240H550L572 298Z" fill="#7fb6cc" fillOpacity=".55" stroke="#cfe6ef" strokeWidth="1.6" />
          <path d="M450 240L500 272L550 240M500 272V298M428 298L500 272L572 298" stroke="#fff" strokeOpacity=".7" strokeWidth="1" fill="none" />
          <path d="M450 240H550L500 272Z" fill="#fff" fillOpacity=".35" />
          <path d="M428 298L500 272V298Z" fill="#0d3a4f" fillOpacity=".35" />
          <rect x="448" y="300" width="104" height="8" fill="#0b0b0c" stroke="#666" />
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={i} x1={452 + i * 8} y1="301" x2={452 + i * 8} y2="307" stroke="#555" />
          ))}
          <circle cx={438} cy={278} r={8} fill="#c9602a" stroke="#fff" strokeOpacity=".5" />
          <circle cx={438} cy={278} r={3} fill="#2a0f04" />
          <path d="M438 286V300M444 284L456 296" stroke="#d9a441" strokeWidth="1.3" fill="none" />
          <rect x="558" y="262" width="38" height="24" rx="2" fill="url(#gPcb)" stroke="#0b3a26" />
          <rect x="564" y="268" width="10" height="6" fill="#111" />
          <circle cx="586" cy="274" r="4" fill="url(#gBrass)" />
          <path d="M574 288V296" stroke="#d9a441" />
        </g>
      ),
    },
    {
      id: "iris",
      name: "Iris diaphragm",
      layer: "muscle",
      cx: LX,
      cy: LY,
      w: 57,
      h: 57,
      ps: 1.3,
      dyn: true,
      blurb: "Nine thin blades that open and close to set how much light gets through.",
      detail:
        "f/1.8 is wide open — a generous bucket of light and a wafer-thin slice of focus. f/16 shrinks the hole to a few millimetres. Stopping down also makes the lens sharper and the depth of field deeper.",
      specs: [
        ["Blades", "9, rounded"],
        ["Range", "f/1.8 – f/16"],
        ["Stops", "1 click each"],
      ],
      render: ({ pulse }) => <Iris cx={LX} cy={LY} R={56} a={9 + pulse * 30} n={9} rot={pulse * 20} />,
    },
    {
      id: "optics",
      name: "Optical groups",
      layer: "muscle",
      cx: LX,
      cy: LY,
      w: 62,
      h: 62,
      ps: 1.25,
      dyn: true,
      blurb: "Six glass elements in five groups, each coated to stop light bouncing where it shouldn't.",
      detail:
        "The purple, green and amber sheen are anti-reflection coatings only a few hundred nanometres thick. Without them roughly half the light would be lost to internal reflections and ghost images.",
      specs: [
        ["Elements", "6 in 5 groups"],
        ["Coating", "Multi-layer"],
        ["Focal length", "50 mm"],
      ],
      render: ({ spin }) => <LensGlass cx={LX} cy={LY} r={62} rot={spin * 0.05} />,
    },

    /* ───────────── SKIN ───────────── */
    {
      id: "leather",
      name: "Leatherette wrap",
      layer: "skin",
      cx: 500,
      cy: 415,
      w: 255,
      h: 80,
      ps: 0.72,
      blurb: "Textured vulcanite bonded to the chassis: grip, insulation and a little armour.",
      detail:
        "Pebbled on purpose: it keeps the camera from sliding out of a cold hand, and hides the scuffs a working camera collects. The hole is cut to reveal just the rim of the mount.",
      specs: [
        ["Material", "Vulcanite"],
        ["Thickness", "0.8 mm"],
        ["Adhesive", "Contact cement"],
      ],
      render: () => (
        <g>
          <path
            fillRule="evenodd"
            d="M245 335H755V495H245Z M612 415a112 112 0 1 0 -224 0a112 112 0 1 0 224 0Z"
            fill="url(#pLeather)"
            stroke="#000"
            strokeWidth="1.5"
          />
          <path
            fillRule="evenodd"
            d="M251 341H749V489H251Z M608 415a108 108 0 1 0 -216 0a108 108 0 1 0 216 0Z"
            fill="none"
            stroke="#777"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <ellipse cx="715" cy="415" rx="36" ry="62" fill="url(#gGloss)" opacity=".25" />
          <circle cx="300" cy="366" r="8" fill="url(#gBtnRed)" stroke="#000" />
          <circle cx="300" cy="366" r="11" fill="none" stroke="url(#gMetal)" strokeWidth="2.5" />
          <T x={300} y={390} s={5.5} fill="#8a8a8e" ls={1}>FLASH</T>
          <rect x="690" y="356" width="44" height="12" rx="6" fill="url(#gChrome)" stroke="#333" />
          <T x={712} y={382} s={5.5} fill="#8a8a8e" ls={1}>SELF TIMER</T>
          <T x={500} y={484} s={6} fill="#6b6b70" ls={3}>MERIDIAN · SLR-35 · MODEL 76</T>
        </g>
      ),
    },
    {
      id: "barrel",
      name: "Lens barrel",
      layer: "skin",
      cx: LX,
      cy: LY,
      w: 104,
      h: 104,
      ps: 0.85,
      dyn: true,
      blurb: "The part you actually touch: a knurled focus ring, an engraved distance scale and an aperture ring.",
      detail:
        "Rotating the focus ring turns a helicoid that slides the optics forward and back. Feet and metres are engraved in white and orange so you can zone-focus without looking.",
      specs: [
        ["Focus throw", "270°"],
        ["Min focus", "0.45 m"],
        ["Filter", "Ø 52 mm"],
      ],
      render: ({ spin }) => (
        <g>
          <circle cx={LX} cy={LY} r="84" fill="none" stroke="url(#gDark)" strokeWidth="40" />
          <circle cx={LX} cy={LY} r="104" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1.5" />
          <g transform={`rotate(${spin * 0.04} ${LX} ${LY})`}>
            <circle cx={LX} cy={LY} r="92" fill="none" stroke="url(#pKnurlD)" strokeWidth="18" />
            <Knurl cx={LX} cy={LY} r={96} w={8} dash="1.4 3" c="#888" o={0.5} />
          </g>
          <circle cx={LX} cy={LY} r="78" fill="none" stroke="url(#gChrome)" strokeWidth="11" />
          <path id="slr-scale" d={`M${LX - 77} ${LY}a77 77 0 1 1 154 0a77 77 0 1 1 -154 0`} fill="none" />
          <text fontSize="6.2" fontFamily="JetBrains Mono, monospace" fill="#222" fontWeight="700" letterSpacing="1.2">
            <textPath href="#slr-scale" startOffset="0">0.45 · 0.6 · 1 · 2 · 5 · ∞ ─ 1.5 · 2 · 3 · 6 · 15 ft ─ ◂ ▸</textPath>
          </text>
          <circle cx={LX} cy={LY} r="69" fill="none" stroke="#0a0a0b" strokeWidth="6" />
          <Knurl cx={LX} cy={LY} r={66} w={3} dash="1 1.4" c="#9a9a9e" o={0.8} />
          <path id="slr-eng" d={`M${LX - 63} ${LY}a63 63 0 1 1 126 0a63 63 0 1 1 -126 0`} fill="none" />
          <text fontSize="6" fontFamily="JetBrains Mono, monospace" fill="#e5e5e5" fontWeight="600" letterSpacing="1.4">
            <textPath href="#slr-eng" startOffset="8">MERIDIAN · 50mm 1:1.8 · Ø52 · Nº 7702318 ·</textPath>
          </text>
          <circle cx={LX} cy={LY - 94} r="4" fill="#e8502a" />
          <rect x={LX - 2} y={LY - 104} width="4" height="10" fill="#fff" />
          <circle cx={LX} cy={LY} r="104" fill="none" stroke="#000" strokeWidth="1" />
        </g>
      ),
    },
    {
      id: "top",
      name: "Top plate & dials",
      layer: "skin",
      cx: 500,
      cy: 275,
      w: 272,
      h: 59,
      ps: 0.78,
      blurb: "Chrome-plated brass with every control a photographer needs: speed dial, rewind crank, shutter release.",
      detail:
        "The speed dial is a mechanical computer — each click positions a cam inside that decides how long the curtains wait between them. The hump houses the prism; the shoe on top carries a flash.",
      specs: [
        ["Material", "Brass, Cr plated"],
        ["Speeds", "1/1000–1 s · B"],
        ["Hot shoe", "ISO 518"],
      ],
      render: () => (
        <g>
          <path d="M405 292L425 246Q430 236 445 236H555Q570 236 575 246L595 292Z" fill="url(#gChrome)" stroke="#2e2e30" strokeWidth="1.5" />
          <path d="M432 250H568" stroke="#fff" strokeOpacity=".8" strokeWidth="1.5" />
          <T x={500} y={272} s={14} fill="#1c1c1e" w={800} ls={3.4} f="Inter, sans-serif">MERIDIAN</T>
          <T x={500} y={284} s={5.5} fill="#444" ls={2.2}>SLR–35 · REFLEX</T>
          <rect x="468" y="224" width="64" height="13" rx="2" fill="url(#gBrass)" stroke="#4a3810" />
          <rect x="475" y="228" width="50" height="3" fill="#2a1f08" />
          <circle cx="500" cy="231" r="2.5" fill="#d9d9d9" />
          <rect x="240" y="292" width="520" height="42" rx="6" fill="url(#gChrome)" stroke="#2e2e30" strokeWidth="1.5" />
          <rect x="246" y="322" width="508" height="3" fill="rgba(0,0,0,.2)" />
          {/* rewind knob */}
          <rect x="268" y="266" width="48" height="28" rx="4" fill="url(#gMetalH)" stroke="#333" />
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={i} x1={272 + i * 3.6} y1="268" x2={272 + i * 3.6} y2="292" stroke="#444" strokeWidth="1" />
          ))}
          <rect x="274" y="259" width="36" height="8" rx="3" fill="url(#gChrome)" stroke="#333" />
          {/* speed dial */}
          <rect x="636" y="260" width="100" height="34" rx="4" fill="url(#gMetalH)" stroke="#333" />
          <rect x="636" y="260" width="100" height="10" rx="4" fill="url(#pKnurl)" opacity=".8" />
          {["1000", "500", "250", "125", "60", "30", "B"].map((t, i) => (
            <T key={t} x={646 + i * 14.4} y={284} s={5.2} fill={t === "B" ? "#c22" : "#1a1a1a"} w={700}>{t}</T>
          ))}
          <rect x="682" y="258" width="8" height="10" fill="#e8502a" />
          {/* shutter button */}
          <ellipse cx="612" cy="280" rx="13" ry="5" fill="url(#gMetal)" stroke="#333" />
          <rect x="599" y="280" width="26" height="14" fill="url(#gMetalH)" stroke="#333" />
          <ellipse cx="612" cy="280" rx="8" ry="3" fill="#222" />
          {/* frame counter */}
          <rect x="340" y="302" width="44" height="22" rx="3" fill="#0d0d0d" stroke="#555" />
          <T x={362} y={318} s={13} fill="#ffd27a" w={700}>24</T>
          <T x={440} y={317} s={6} fill="#333" ls={1.4}>EXPOSURES</T>
          {[256, 744, 430, 570, 520].map((x, i) => (
            <Screw key={x} x={x} y={i > 2 ? 328 : 312} r={4} a={i * 33} />
          ))}
          {/* strap lugs */}
          {[-1, 1].map((d) => (
            <g key={d}>
              <rect x={d < 0 ? 228 : 754} y="310" width="18" height="16" rx="3" fill="url(#gChrome)" stroke="#333" />
              <circle cx={d < 0 ? 228 : 772} cy="318" r="9" fill="none" stroke="url(#gMetalH)" strokeWidth="4" />
            </g>
          ))}
        </g>
      ),
    },
    {
      id: "base",
      name: "Base plate",
      layer: "skin",
      cx: 500,
      cy: 519,
      w: 264,
      h: 14,
      ps: 0.9,
      blurb: "The floor of the camera: tripod thread, battery lid and the serial number you'll quote to a repair shop.",
      detail:
        "Two screws hold it on, and the only thing under it is film and the rewind fork. Undo them and you can reach the drive gears in the chassis.",
      specs: [
        ["Tripod", "¼-20 UNC"],
        ["Finish", "Chrome"],
        ["Screws", "4"],
      ],
      render: () => (
        <g>
          <rect x="238" y="506" width="524" height="26" rx="5" fill="url(#gChrome)" stroke="#2e2e30" strokeWidth="1.5" />
          {[256, 744, 380, 620].map((x, i) => (
            <Screw key={x} x={x} y={519} r={4.2} a={i * 50} />
          ))}
          <rect x="430" y="511" width="140" height="16" rx="3" fill="#15151a" stroke="#555" />
          <T x={500} y={523} s={6.6} fill="#d6d6d6" ls={2.4} w={600}>MADE IN OLD EUROPE · Nº 4471208</T>
          <circle cx="320" cy="519" r="6" fill="url(#gBtnRed)" stroke="#333" />
          <T x={335} y={522} s={5} fill="#333" anchor="start" ls={1}>REWIND</T>
        </g>
      ),
    },
  ],
};
