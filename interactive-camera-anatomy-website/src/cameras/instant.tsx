import type { CameraDef } from "../types";
import { Chip, Coil, Gear, Knurl, LensGlass, Screw, T } from "./kit";

const CX = 500;
const CY = 400;
const RAINBOW = ["#e8453c", "#f58a1f", "#f9c31c", "#4fae4e", "#2f7fd4"];

export const instant: CameraDef = {
  id: "instant",
  no: "03",
  name: "The Instant Camera",
  model: "MERIDIAN ONESHOT 600",
  year: "1981",
  kind: "Integral instant film · motorised",
  tagline: "A camera, a darkroom and a printer, in one white box.",
  story:
    "Press the red button and a motor squeezes a pod of chemistry across your photograph while you watch. It's the only camera on this page that develops its own picture.",
  accent: "#ff6b57",
  glow: "rgba(255,107,87,.15)",
  stats: [
    ["Format", "79 × 79 mm image"],
    ["Flash", "Xenon · auto"],
    ["Parts in view", "12"],
  ],
  rebuild: {
    skeleton: "Bones first: a moulded chassis with a film deck cut into it, and a bellows tunnel that keeps the light in on the way from lens to film.",
    muscle: "Muscle: film pack, roller motor, circuit board, flash tube and lens cell. Every one of them is a small machine that only makes sense with the rest.",
    skin: "Skin last: a white shell, rainbow stripe, red button and smoked flash window. Friendly enough that nobody is afraid of it.",
  },
  parts: [
    /* ── skeleton ── */
    {
      id: "chassis",
      name: "Moulded chassis",
      layer: "skeleton",
      cx: 500,
      cy: 388,
      w: 200,
      h: 148,
      ps: 0.68,
      blurb: "Glass-filled ABS plastic with the film deck, battery contacts and every mounting boss moulded in.",
      detail:
        "Plastic is cheap, light and — if you design the ribs right — stiff. Every hole in this part is a place where something else clips or screws in; the ribs mean it doesn't flex when the roller motor kicks.",
      specs: [
        ["Material", "ABS + 20 % glass"],
        ["Bosses", "14"],
        ["Shots", "≈ 1 M per tool"],
      ],
      render: () => (
        <g>
          <rect x="300" y="240" width="400" height="295" rx="38" fill="url(#gDark)" stroke="#000" strokeWidth="1.6" />
          <rect x="310" y="250" width="380" height="275" rx="30" fill="none" stroke="rgba(255,255,255,.14)" />
          <rect x="336" y="254" width="328" height="14" rx="4" fill="#060607" stroke="#555" />
          <T x={500} y={264} s={5} fill="#777" ls={2.4}>FILM EXIT SLOT</T>
          <rect x="350" y="366" width="300" height="152" rx="8" fill="#0a0a0c" stroke="rgba(255,255,255,.2)" />
          {[380, 396, 412, 428, 444].map((y) => (
            <line key={y} x1="356" x2="644" y1={y + 88} y2={y + 88} stroke="rgba(255,255,255,.05)" />
          ))}
          <circle cx={CX} cy={CY} r="74" fill="#050506" stroke="#666" strokeWidth="1.6" />
          <circle cx={CX} cy={CY} r="86" fill="none" stroke="rgba(255,255,255,.18)" strokeDasharray="4 4" />
          {[
            [330, 280],
            [670, 280],
            [330, 506],
            [670, 506],
            [500, 286],
            [500, 512],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="8" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.25)" />
              <Screw x={x} y={y} r={3.6} a={i * 49} />
            </g>
          ))}
          <rect x="356" y="486" width="24" height="26" rx="3" fill="url(#gBrass)" stroke="#4a3810" />
          <rect x="620" y="486" width="24" height="26" rx="3" fill="url(#gBrass)" stroke="#4a3810" />
          <T x={500} y={526} s={5.5} fill="#77777c" ls={2}>ABS-GF20 · 81-OS-600 · C</T>
        </g>
      ),
    },
    {
      id: "tunnel",
      name: "Bellows tunnel",
      layer: "skeleton",
      cx: CX,
      cy: CY,
      w: 95,
      h: 95,
      ps: 1.05,
      blurb: "A folded, light-proof accordion between lens and film that stops stray light from fogging the picture.",
      detail:
        "Each fold bounces light into a dead end. Inside it's flocked black; outside it's pleated so that it can compress when the camera folds. No light gets to the film until the shutter says so.",
      specs: [
        ["Folds", "9"],
        ["Material", "Black PET"],
        ["Travel", "42 mm"],
      ],
      render: () => (
        <g>
          {Array.from({ length: 9 }).map((_, i) => {
            const s = 190 - i * 14;
            const c = i % 2 ? "#2d2d31" : "#19191b";
            return <rect key={i} x={CX - s / 2} y={CY - s / 2} width={s} height={s} rx={8 - i * 0.5} fill={c} stroke="#000" strokeWidth="1" />;
          })}
          <path d={`M${CX - 95} ${CY - 95}L${CX - 35} ${CY - 35}M${CX + 95} ${CY - 95}L${CX + 35} ${CY - 35}M${CX - 95} ${CY + 95}L${CX - 35} ${CY + 35}M${CX + 95} ${CY + 95}L${CX + 35} ${CY + 35}`} stroke="rgba(255,255,255,.22)" />
          <rect x={CX - 34} y={CY - 34} width="68" height="68" rx="4" fill="#020203" />
        </g>
      ),
    },

    /* ── muscle ── */
    {
      id: "filmpack",
      name: "Film pack",
      layer: "muscle",
      cx: 500,
      cy: 442,
      w: 148,
      h: 70,
      ps: 0.98,
      blurb: "Ten self-developing photographs, stacked like a deck, plus a flat battery to power the camera.",
      detail:
        "Each sheet is a sandwich: negative, reagent pod, positive. A dark slide on top protects the stack until you've loaded it. The battery lives in the pack, so every new film is a fresh battery too.",
      specs: [
        ["Sheets", "10 · 600 ISO"],
        ["Battery", "6 V flat cell"],
        ["Develop", "≈ 10 min"],
      ],
      render: () => (
        <g>
          <rect x="352" y="372" width="296" height="140" rx="8" fill="url(#gWhite)" stroke="#888" strokeWidth="1.3" />
          <rect x="352" y="372" width="296" height="20" rx="8" fill="#0d0d0f" />
          <rect x="376" y="380" width="248" height="4" rx="2" fill="#555" />
          {RAINBOW.map((c, i) => (
            <rect key={c} x="362" y={402 + i * 5} width="276" height="5" fill={c} />
          ))}
          <T x={500} y={452} s={18} fill="#1a1a1c" w={800} ls={4} f="Inter, sans-serif">600 FILM</T>
          <T x={500} y={468} s={6.4} fill="#555" ls={2.6}>INSTANT · 10 EXPOSURES · COLOUR</T>
          <rect x="362" y="480" width="62" height="24" rx="4" fill="#d9d9d9" stroke="#999" />
          <T x={393} y={496} s={7} fill="#333" w={700}>⚡ 6V</T>
          <rect x="576" y="480" width="62" height="24" rx="4" fill="#222" />
          <T x={607} y={496} s={5.5} fill="#ddd" ls={1}>ISO 640</T>
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={352 + i * 2} y={512 + i * 0} width={296 - i * 4} height="0" />
          ))}
        </g>
      ),
    },
    {
      id: "rollers",
      name: "Spreader rollers & motor",
      layer: "muscle",
      cx: 519,
      cy: 274,
      w: 187,
      h: 22,
      ps: 0.86,
      dyn: true,
      blurb: "Two steel rollers squeeze each print as it leaves, breaking the chemical pod and smearing it evenly.",
      detail:
        "The motor spins the rollers for about a second. The gap between them is ~0.08 mm — wide enough for the film, narrow enough to spread the reagent into a perfect, bubble-free layer that starts the development.",
      specs: [
        ["Gap", "0.08 mm"],
        ["Motor", "3 V DC gearmotor"],
        ["Pressure", "≈ 40 kgf"],
      ],
      render: ({ spin }) => (
        <g>
          <rect x="362" y="256" width="270" height="19" rx="9" fill="url(#gMetal)" stroke="#444" />
          <rect x="362" y="273" width="270" height="19" rx="9" fill="url(#gMetal)" stroke="#444" />
          <rect x="362" y="273" width="270" height="1.4" fill="#000" opacity=".7" />
          {Array.from({ length: 45 }).map((_, i) => (
            <g key={i}>
              <line x1={370 + i * 5.8} x2={370 + i * 5.8} y1="259" y2="272" stroke="rgba(0,0,0,.18)" />
              <line x1={370 + i * 5.8} x2={370 + i * 5.8} y1="276" y2="290" stroke="rgba(0,0,0,.18)" />
            </g>
          ))}
          <Gear cx={348} cy={265} r={12} n={12} rot={spin * 1.5} holes={3} />
          <Gear cx={348} cy={283} r={10} n={10} rot={-spin * 1.8 + 9} holes={3} />
          <rect x="632" y="254" width="74" height="40" rx="8" fill="url(#gMetalH)" stroke="#333" />
          <rect x="690" y="262" width="22" height="24" rx="3" fill="#b79a54" stroke="#4a3810" />
          <rect x="640" y="262" width="36" height="24" rx="2" fill="#d9d9dc" stroke="#888" />
          <T x={658} y={276} s={6} fill="#222" w={700}>3V DC</T>
          <T x={658} y={283} s={4} fill="#444">M-61</T>
          <path d="M700 294Q720 300 716 316M706 290Q730 296 726 310" stroke="#d33" fill="none" strokeWidth="1.5" />
          <path d="M700 294Q720 300 716 316" stroke="#111" fill="none" strokeWidth="0" />
        </g>
      ),
    },
    {
      id: "pcb",
      name: "Main circuit board",
      layer: "muscle",
      cx: 495,
      cy: 450,
      w: 165,
      h: 80,
      ps: 0.98,
      blurb: "A single little green board that times the shutter, fires the flash and runs the motor.",
      detail:
        "A light sensor on a flex cable reads the scene; the microcontroller decides how long the shutter stays open and whether the flash is needed. Its whole program fits in a few kilobytes.",
      specs: [
        ["MCU", "8-bit · 4 MHz"],
        ["Sensor", "CdS photocell"],
        ["Layers", "2"],
      ],
      render: () => (
        <g>
          <rect x="330" y="432" width="232" height="98" rx="6" fill="url(#gPcb)" stroke="#0b3a26" strokeWidth="1.4" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path key={i} d={`M340 ${442 + i * 12}H${380 + i * 8}L${392 + i * 8} ${450 + i * 12}H540`} fill="none" stroke="#e0c070" strokeOpacity=".5" strokeWidth="1.3" />
          ))}
          <Chip x={396} y={452} w={44} h={32} label="MCU 4MHz" />
          <Chip x={460} y={470} w={28} h={20} label="DRV" />
          <rect x="500" y="448" width="36" height="22" rx="2" fill="#2458a3" stroke="#0b2346" />
          <T x={518} y={462} s={5} fill="#cfe2ff" w={700}>47µF</T>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={346 + i * 9} y="500" width="6" height="10" fill="#111" stroke="#666" strokeWidth=".6" />
          ))}
          <circle cx="350" cy="450" r="5" fill="url(#gBrass)" />
          <circle cx="540" cy="512" r="5" fill="url(#gLed)" />
          <circle cx="540" cy="512" r="2.2" fill="#ff6b57" />
          <T x={460} y={516} s={5} fill="#c7f0da" ls={1.2}>REV C · 81-600</T>
          {[345, 552, 345, 552].map((x, i) => (
            <Screw key={i} x={x} y={i < 2 ? 441 : 521} r={3} a={i * 40} />
          ))}
          <path d="M562 470C600 470 640 440 650 386" stroke="#d9a441" strokeWidth="6" fill="none" opacity=".9" />
          <path d="M562 470C600 470 640 440 650 386" stroke="#8a5a1a" strokeWidth="1" fill="none" />
          <circle cx="650" cy="380" r="10" fill="#c9602a" stroke="#fff" strokeOpacity=".5" />
          <circle cx="650" cy="380" r="4" fill="#2a0f04" />
        </g>
      ),
    },
    {
      id: "flash",
      name: "Xenon flash unit",
      layer: "muscle",
      cx: 640,
      cy: 330,
      w: 50,
      h: 44,
      ps: 1.55,
      dyn: true,
      blurb: "A glass tube full of xenon gas and a capacitor that stores a bolt of lightning for when the room goes dark.",
      detail:
        "The capacitor charges to ~300 V in a few seconds — that whine you hear. When you press the button a trigger coil ionises the gas and everything discharges through it in about 1/1000 second: a tiny, controlled lightning bolt.",
      specs: [
        ["Voltage", "≈ 300 V"],
        ["Energy", "5 J"],
        ["Flash time", "1/1000 s"],
      ],
      render: ({ pulse }) => (
        <g>
          <rect x="592" y="288" width="96" height="54" rx="5" fill="url(#gChrome)" stroke="#333" />
          <rect x="598" y="294" width="84" height="42" rx="3" fill="#dcdcd8" />
          <path d="M600 318Q640 286 680 318" fill="none" stroke="#999" />
          <path d="M606 324V300H674V324" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" opacity={0.55 + pulse * 0.4} filter="url(#glow)" />
          <path d="M606 324V300H674V324" fill="none" stroke="#f4f0dc" strokeWidth="5" strokeLinecap="round" />
          <path d="M606 324V300H674V324" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="612" y="346" width="50" height="26" rx="13" fill="#1d50a0" stroke="#0b2346" />
          <rect x="612" y="346" width="10" height="26" rx="5" fill="rgba(255,255,255,.3)" />
          <T x={640} y={362} s={5.5} fill="#e8f0ff" w={700}>300V 120µF</T>
          <Coil x={665} y={346} w={22} h={10} n={3} color="#d9a441" />
          <path d="M592 350H612M662 359H690" stroke="#888" strokeWidth="2" />
        </g>
      ),
    },
    {
      id: "viewfinder",
      name: "Viewfinder optics",
      layer: "muscle",
      cx: 362,
      cy: 314,
      w: 38,
      h: 26,
      ps: 2.2,
      blurb: "A tiny reversed telescope. No electronics: just two lenses that show roughly what the big lens sees.",
      detail:
        "You look through the back and see the scene at about 0.4× magnification, with a bright frame and parallax marks for close-up work. It's slightly off-axis from the lens — that's the price of a simple, cheap, bright finder.",
      specs: [
        ["Lenses", "2 acrylic"],
        ["Magnification", "0.4×"],
        ["Frame", "≈ 85 %"],
      ],
      render: () => (
        <g>
          <rect x="324" y="288" width="76" height="52" rx="6" fill="#0a0a0c" stroke="#666" strokeWidth="1.4" />
          <rect x="330" y="294" width="64" height="40" rx="3" fill="url(#gGlass)" />
          <circle cx="352" cy="314" r="13" fill="url(#gCoatG)" stroke="#9fd8ff" strokeOpacity=".5" />
          <circle cx="378" cy="314" r="9" fill="url(#gCoatP)" stroke="#9fd8ff" strokeOpacity=".5" />
          <rect x="336" y="299" width="52" height="30" rx="2" fill="none" stroke="#ffd27a" strokeOpacity=".75" strokeDasharray="4 3" />
          <path d="M358 314H366M362 310V318" stroke="#fff" strokeOpacity=".6" />
          <rect x="330" y="294" width="64" height="10" fill="url(#gGloss)" />
        </g>
      ),
    },
    {
      id: "lens",
      name: "Lens & shutter cell",
      layer: "muscle",
      cx: CX,
      cy: CY,
      w: 66,
      h: 66,
      ps: 1.25,
      dyn: true,
      blurb: "One plastic meniscus lens and two sliding blades: the simplest camera optics there is.",
      detail:
        "It's a fixed-focus lens with a small aperture, sharp from about 1.2 m to infinity. The two blades snap apart and together in an instant; scroll to watch them cycle.",
      specs: [
        ["Lens", "106 mm f/12.7"],
        ["Focus", "Fixed 1.2 m–∞"],
        ["Blades", "2 sliding"],
      ],
      render: ({ pulse }) => {
        const g = 4 + pulse * 40;
        return (
          <g>
            <clipPath id="im-lc">
              <circle cx={CX} cy={CY} r="60" />
            </clipPath>
            <circle cx={CX} cy={CY} r="66" fill="url(#gChrome)" stroke="#333" />
            <LensGlass cx={CX} cy={CY} r={60} />
            <g clipPath="url(#im-lc)">
              <rect x={CX - 62} y={CY - 62} width="124" height={62 - g} fill="#141416" />
              <rect x={CX - 62} y={CY + g} width="124" height={62 - g} fill="#141416" />
              <rect x={CX - 62} y={CY - g - 1.5} width="124" height="2" fill="rgba(255,255,255,.3)" />
              <rect x={CX - 62} y={CY + g - 0.5} width="124" height="2" fill="rgba(255,255,255,.3)" />
            </g>
            <Knurl cx={CX} cy={CY} r={63} w={4} dash="1 1.6" c="#555" o={0.8} />
          </g>
        );
      },
    },

    /* ── skin ── */
    {
      id: "shell",
      name: "Front shell",
      layer: "skin",
      cx: 500,
      cy: 388,
      w: 210,
      h: 158,
      ps: 0.66,
      blurb: "Glossy white injection-moulded shell with a rainbow stripe that became the face of a whole era.",
      detail:
        "Cut-outs for the lens, the viewfinder, the flash, the light eye and the button. The speaker mesh lets the motor's whir out. The stripe is a separate in-mould label, fused as the plastic cools.",
      specs: [
        ["Material", "ABS, gloss"],
        ["Stripe", "In-mould label"],
        ["Cut-outs", "5"],
      ],
      render: () => (
        <g>
          <path
            fillRule="evenodd"
            d={`M336 230H664Q710 230 710 276V499Q710 545 664 545H336Q290 545 290 499V276Q290 230 336 230Z M${CX + 104} ${CY}a104 104 0 1 0 -208 0a104 104 0 1 0 208 0Z M326 290H398V338H326Z M594 290H686V340H594Z M650 380m-11 0a11 11 0 1 0 22 0a11 11 0 1 0 -22 0Z M650 470m-26 0a26 26 0 1 0 52 0a26 26 0 1 0 -52 0Z`}
            fill="url(#gWhite)"
            stroke="#8f8878"
            strokeWidth="1.6"
          />
          {RAINBOW.map((c, i) => (
            <rect key={c} x="300" y={240 + i * 4.6} width="400" height="4.6" fill={c} />
          ))}
          <path d="M300 240H700" stroke="rgba(255,255,255,.7)" />
          <rect x="314" y="456" width="60" height="46" rx="5" fill="url(#pMesh)" stroke="#999" />
          <T x={344} y={518} s={5} fill="#777" ls={1.5}>MOTOR</T>
          <T x={500} y={534} s={13} fill="#26262a" w={800} ls={5} f="Inter, sans-serif">ONESHOT</T>
          <T x={500} y={524} s={5.5} fill="#888" ls={3}>MERIDIAN · 600</T>
          <circle cx="314" cy="314" r="4" fill="#d22" />
          <path d="M296 380Q500 350 704 380" fill="none" stroke="rgba(0,0,0,.06)" strokeWidth="2" />
          <path d="M300 236Q500 222 700 236L700 300Q500 268 300 300Z" fill="url(#gGloss)" opacity=".35" />
          <T x={650} y={416} s={4.6} fill="#888" ls={1.4}>EYE</T>
        </g>
      ),
    },
    {
      id: "bezel",
      name: "Lens bezel",
      layer: "skin",
      cx: CX,
      cy: CY,
      w: 104,
      h: 104,
      ps: 0.78,
      blurb: "A gloss-black ring with a chrome trim and the lens specification printed around it.",
      detail:
        "It's as much a design flourish as a functional part: a rim to catch fingers before they touch the glass, a place to put the f-number, and a stop for the lens cell behind.",
      specs: [
        ["Finish", "Piano black"],
        ["Trim", "Chrome ring"],
        ["Marks", "Pad-printed"],
      ],
      render: () => (
        <g>
          <circle cx={CX} cy={CY} r="84" fill="none" stroke="url(#gDark)" strokeWidth="40" />
          <circle cx={CX} cy={CY} r="104" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" />
          <circle cx={CX} cy={CY} r="66" fill="none" stroke="url(#gChrome)" strokeWidth="5" />
          <circle cx={CX} cy={CY} r="74" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1" />
          <path id="im-eng" d={`M${CX - 86} ${CY}a86 86 0 1 1 172 0a86 86 0 1 1 -172 0`} fill="none" />
          <text fontSize="6.6" fontFamily="JetBrains Mono, monospace" fill="#e8e8e8" fontWeight="700" letterSpacing="2.2">
            <textPath href="#im-eng" startOffset="14">MERIDIAN OneShot · 106mm f/12.7 · 600 FILM ·</textPath>
          </text>
          <path d={`M${CX - 90} ${CY + 38}A98 98 0 0 0 ${CX + 90} ${CY + 38}`} stroke="rgba(255,255,255,.14)" fill="none" />
          <path d={`M${CX - 66} ${CY - 70}A98 98 0 0 1 ${CX + 10} ${CY - 98}`} stroke="#fff" strokeOpacity=".4" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx={CX} cy={CY + 94} r="3" fill="#ff6b57" />
        </g>
      ),
    },
    {
      id: "flashwin",
      name: "Flash window",
      layer: "skin",
      cx: 640,
      cy: 315,
      w: 46,
      h: 25,
      ps: 1.8,
      blurb: "A smoked fresnel lens that spreads the flash into an even wash.",
      detail:
        "The fine vertical ridges act like dozens of tiny cylindrical lenses, turning a hot point of light into a rectangle matched to what the lens sees. The smoke tint hides the mechanism without eating the light.",
      specs: [
        ["Type", "Fresnel"],
        ["Tint", "Smoked amber"],
        ["Spread", "60° × 45°"],
      ],
      render: () => (
        <g>
          <rect x="590" y="286" width="100" height="58" rx="8" fill="#1a1a1c" stroke="#555" />
          <rect x="596" y="292" width="88" height="46" rx="5" fill="#3a2a16" />
          {Array.from({ length: 29 }).map((_, i) => (
            <line key={i} x1={599 + i * 3} x2={599 + i * 3} y1="294" y2="336" stroke="rgba(255,220,160,.22)" strokeWidth="1.2" />
          ))}
          <rect x="596" y="292" width="88" height="18" rx="5" fill="url(#gGloss)" />
          <T x={640} y={326} s={5.4} fill="#e8c88a" ls={2}>FLASH</T>
        </g>
      ),
    },
    {
      id: "button",
      name: "Shutter button",
      layer: "skin",
      cx: 650,
      cy: 470,
      w: 24,
      h: 24,
      ps: 2.6,
      blurb: "Big, red, satisfying. The only button on the camera, because that's all a camera needs.",
      detail:
        "A light half-press wakes the electronics and starts the flash charging; a full press trips the shutter. The travel is 2 mm and the return spring gives it that unmistakable, tactile click.",
      specs: [
        ["Travel", "2 mm"],
        ["Force", "120 gf"],
        ["Cap", "Red PC"],
      ],
      render: () => (
        <g>
          <circle cx="650" cy="470" r="25" fill="url(#gDark)" stroke="#000" />
          <circle cx="650" cy="470" r="21" fill="url(#gBtnRed)" stroke="#5a0a05" />
          <circle cx="650" cy="470" r="14" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1.2" />
          <ellipse cx="643" cy="461" rx="9" ry="5" fill="#fff" opacity=".55" transform="rotate(-30 643 461)" />
        </g>
      ),
    },
  ],
};
