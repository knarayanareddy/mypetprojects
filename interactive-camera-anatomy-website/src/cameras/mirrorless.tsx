import type { CameraDef } from "../types";
import { Chip, Coil, Knurl, LensGlass, Screw, Spiral, T } from "./kit";

const LX = 470;
const LY = 405;

export const mirrorless: CameraDef = {
  id: "mirrorless",
  no: "04",
  name: "The Mirrorless",
  model: "MERIDIAN M-CSC",
  year: "2023",
  kind: "Digital · 61 MP · 5-axis stabilised",
  tagline: "No mirror, no curtain-slap — just a sensor, a processor and a lot of silicon.",
  story:
    "It takes everything the SLR did with clockwork and does it with code. The sensor is always live, the viewfinder is a tiny screen, and the stabiliser floats the sensor itself on magnets.",
  accent: "#7aa2ff",
  glow: "rgba(122,162,255,.16)",
  stats: [
    ["Sensor", "36 × 24 mm · 61 MP"],
    ["Shutter", "1/8000 – 30 s"],
    ["Parts in view", "12"],
  ],
  rebuild: {
    skeleton: "Bones first: a magnesium alloy chassis with its heat fins, and a gold-pinned mount that talks to the lens. Nothing electronic yet.",
    muscle: "Muscle next: the floating sensor, the carbon shutter, the processor board, the battery, the EVF, the LCD and the lens optics snap into the skeleton.",
    skin: "Skin last: rubberised grip, machined dials, a black barrel with silver trim. You'd never know there's a computer inside.",
  },
  parts: [
    /* ── skeleton ── */
    {
      id: "chassis",
      name: "Magnesium chassis",
      layer: "skeleton",
      cx: 504,
      cy: 400,
      w: 252,
      h: 96,
      ps: 0.64,
      blurb: "A thin-wall magnesium alloy frame that holds everything rigid — and acts as a heat sink.",
      detail:
        "Magnesium is 33 % lighter than aluminium and dissipates heat well. The fins on the right are not just decoration: they pull heat away from the processor so the camera can shoot video for hours.",
      specs: [
        ["Alloy", "AZ91 Mg"],
        ["Wall", "0.9 mm"],
        ["Sealing", "IP-weather"],
      ],
      render: () => (
        <g>
          <rect x="252" y="304" width="504" height="192" rx="18" fill="url(#gDarkH)" stroke="#000" strokeWidth="1.5" />
          <rect x="260" y="312" width="488" height="176" rx="12" fill="none" stroke="rgba(255,255,255,.16)" />
          <rect x="380" y="332" width="180" height="146" rx="8" fill="#050506" stroke="#6a6a70" strokeWidth="1.2" />
          <circle cx={LX} cy={LY} r="92" fill="none" stroke="#3b3b40" strokeWidth="2" strokeDasharray="4 3" />
          {Array.from({ length: 14 }).map((_, i) => (
            <rect key={i} x={586 + i * 11} y="318" width="5" height="164" rx="2" fill="rgba(255,255,255,.12)" stroke="rgba(0,0,0,.6)" />
          ))}
          <rect x="674" y="334" width="80" height="138" rx="6" fill="#050506" stroke="#6a6a70" />
          <rect x="266" y="340" width="42" height="36" rx="4" fill="#0a0a0c" stroke="#555" />
          <T x={287} y={362} s={6} fill="#888" ls={1.2}>SD 1</T>
          {[
            [270, 322],
            [740, 322],
            [270, 480],
            [740, 480],
            [376, 322],
            [566, 322],
            [376, 488],
            [566, 488],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="8" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.25)" />
              <Screw x={x} y={y} r={3.5} a={i * 47} />
            </g>
          ))}
          <T x={320} y={420} s={6.4} fill="#80848c" ls={1.6} anchor="middle">AZ91 · MG</T>
        </g>
      ),
    },
    {
      id: "mount",
      name: "Lens mount",
      layer: "skeleton",
      cx: LX,
      cy: LY,
      w: 112,
      h: 112,
      ps: 0.78,
      blurb: "A wide stainless bayonet with ten gold pins that let the body and lens talk to each other.",
      detail:
        "The short 18 mm flange distance is what lets this camera be small — there's no mirror to clear. The pins carry power to the focus motor and data both ways: focal length, aperture, distance and correction profiles.",
      specs: [
        ["Flange", "18 mm"],
        ["Throat", "50 mm"],
        ["Contacts", "10 gold pins"],
      ],
      render: () => (
        <g>
          <circle cx={LX} cy={LY} r="112" fill="url(#gChrome)" stroke="#333" strokeWidth="1.5" />
          <circle cx={LX} cy={LY} r="104" fill="none" stroke="rgba(0,0,0,.35)" />
          <circle cx={LX} cy={LY} r="92" fill="#050506" stroke="#222" strokeWidth="2" />
          {[0, 120, 240].map((a) => (
            <g key={a} transform={`rotate(${a + 15} ${LX} ${LY})`}>
              <path d={`M${LX + 76} ${LY - 16}H${LX + 96}V${LY + 16}H${LX + 76}Z`} fill="url(#gMetalH)" stroke="#444" />
            </g>
          ))}
          {Array.from({ length: 10 }).map((_, i) => {
            const a = ((52 + i * 8.4) * Math.PI) / 180;
            const r = 84;
            return (
              <rect
                key={i}
                x={LX + Math.cos(a) * r - 1.8}
                y={LY + Math.sin(a) * r - 4}
                width="3.6"
                height="8"
                rx="1"
                fill="url(#gBrass)"
                stroke="#5b4214"
                strokeWidth=".5"
                transform={`rotate(${(a * 180) / Math.PI - 90} ${LX + Math.cos(a) * r} ${LY + Math.sin(a) * r})`}
              />
            );
          })}
          {[45, 135, 225, 315].map((a, i) => (
            <Screw key={a} x={LX + Math.cos((a * Math.PI) / 180) * 101} y={LY + Math.sin((a * Math.PI) / 180) * 101} r={4.2} a={i * 45} />
          ))}
          <circle cx={LX - 60} cy={LY - 78} r="5" fill="#d22" stroke="#611" />
          <circle cx={LX + 60} cy={LY - 78} r="3.5" fill="url(#gBrass)" stroke="#5b4214" />
          <T x={LX} y={LY - 96} s={5.6} fill="#333" ls={2} w={700}>M-MOUNT · 10 PIN</T>
        </g>
      ),
    },

    /* ── muscle ── */
    {
      id: "sensor",
      name: "Floating image sensor",
      layer: "muscle",
      cx: LX,
      cy: LY,
      w: 82,
      h: 66,
      ps: 1.25,
      dyn: true,
      blurb: "61 million light-sensitive cells on a stage held in mid-air by magnets and coils.",
      detail:
        "A red, green or blue filter sits over each pixel — twice as many green as red or blue, like the eye. The whole stage is suspended electromagnetically and moves up to 5 axes, 1000 times a second, to cancel your shake.",
      specs: [
        ["Type", "BSI CMOS"],
        ["Pixels", "61 MP"],
        ["IBIS", "5-axis · 7.5 stops"],
      ],
      render: ({ spin }) => {
        const dx = Math.sin(spin * 0.06) * 3;
        const dy = Math.cos(spin * 0.045) * 2.4;
        return (
          <g>
            <rect x="388" y="339" width="164" height="132" rx="10" fill="url(#gMetalH)" stroke="#333" strokeWidth="1.3" />
            {[
              [402, 353],
              [538, 353],
              [402, 457],
              [538, 457],
            ].map(([x, y], i) => (
              <g key={i}>
                <rect x={x - 13} y={y - 12} width="26" height="24" rx="3" fill="#0d0d0f" stroke="#555" />
                <Spiral cx={x} cy={y} r={10} turns={4} color="#d27a42" sw={1.3} />
              </g>
            ))}
            <rect x="474" y="342" width="22" height="5" fill="#b43" />
            <rect x="444" y="342" width="22" height="5" fill="#35b" />
            <g transform={`translate(${dx} ${dy})`}>
              <rect x="410" y="365" width="120" height="80" rx="3" fill="#0c0c10" stroke="#ccc" strokeWidth="1.4" />
              <rect x="416" y="371" width="108" height="68" fill="url(#pBayer)" />
              <rect x="416" y="371" width="108" height="68" fill="url(#gSensor)" />
              <path d="M416 439L524 371" stroke="#fff" strokeOpacity=".35" strokeWidth="6" />
              {Array.from({ length: 16 }).map((_, i) => (
                <g key={i}>
                  <rect x={414 + i * 6.6} y="366" width="2" height="3" fill="#d9a441" />
                  <rect x={414 + i * 6.6} y="441" width="2" height="3" fill="#d9a441" />
                </g>
              ))}
            </g>
            <path d="M440 445H500V471H440Z" fill="#d9a441" stroke="#7a5a22" />
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={i} x1={444 + i * 6} x2={444 + i * 6} y1="448" y2="470" stroke="#7a4a10" strokeWidth="1" />
            ))}
            <T x={LX} y={335} s={5.4} fill="#7aa2ff" ls={2}>36 × 24 mm · 61 MP BSI</T>
          </g>
        );
      },
    },
    {
      id: "shutter",
      name: "Carbon shutter",
      layer: "muscle",
      cx: LX,
      cy: 405,
      w: 62,
      h: 47,
      ps: 1.4,
      dyn: true,
      blurb: "Four feather-light carbon-fibre blades, used only when you need them — video and live view run electronically.",
      detail:
        "Because the electronic shutter can read the sensor row by row, the mechanical one is a backup for flash and fast subjects. Each blade weighs less than a grain of rice and moves a full frame in 1/320 s.",
      specs: [
        ["Blades", "4 carbon fibre"],
        ["Life", "500 000 actuations"],
        ["Fastest", "1/8000 s"],
      ],
      render: ({ pulse }) => {
        const gap = 10 + pulse * 70;
        const half = (94 - gap) / 2;
        return (
          <g>
            <rect x="408" y="356" width="124" height="98" rx="8" fill="url(#gDark)" stroke="#666" strokeWidth="1.3" />
            <rect x="416" y="362" width="108" height="86" fill="#d8d8d4" />
            <rect x="416" y="362" width="108" height={half} fill="url(#pCarbon)" />
            <rect x="416" y={448 - half} width="108" height={half} fill="url(#pCarbon)" />
            <rect x="416" y={362 + half - 2} width="108" height="3" fill="#777" />
            <rect x="416" y={448 - half - 1} width="108" height="3" fill="#777" />
            <Coil x={411} y={376} w={6} h={56} n={8} color="#d27a42" />
            <Coil x={523} y={376} w={6} h={56} n={8} color="#d27a42" />
            <Screw x={414} y={360} r={2.6} />
            <Screw x={526} y={360} r={2.6} a={60} />
            <Screw x={414} y={450} r={2.6} a={90} />
            <Screw x={526} y={450} r={2.6} a={120} />
          </g>
        );
      },
    },
    {
      id: "board",
      name: "Processor board",
      layer: "muscle",
      cx: 626,
      cy: 405,
      w: 36,
      h: 75,
      ps: 1.65,
      blurb: "The brain: an image processor, memory, storage controller and power chips on a six-layer board.",
      detail:
        "Every photo runs through demosaicing, noise reduction, colour science and compression in a fraction of a second. The processor also drives autofocus tracking, which can recognise eyes, animals and vehicles.",
      specs: [
        ["Processor", "Image engine"],
        ["Memory", "4 GB LPDDR"],
        ["Layers", "6, HDI"],
      ],
      render: () => (
        <g>
          <rect x="590" y="330" width="72" height="150" rx="5" fill="url(#gPcbDark)" stroke="#2a3150" strokeWidth="1.3" />
          {Array.from({ length: 9 }).map((_, i) => (
            <path key={i} d={`M594 ${338 + i * 16}H${610 + (i % 3) * 8}L${620 + (i % 3) * 8} ${346 + i * 16}H658`} fill="none" stroke="#d9a441" strokeOpacity=".5" strokeWidth="1" />
          ))}
          <rect x="598" y="352" width="44" height="44" rx="3" fill="#0a0a0c" stroke="#8a8a90" />
          <rect x="604" y="358" width="32" height="32" fill="#16161a" stroke="#555" />
          <T x={620} y={375} s={5.2} fill="#7aa2ff" w={700}>ENGINE</T>
          <T x={620} y={383} s={4} fill="#888">X-7</T>
          <Chip x={598} y={408} w={24} h={16} label="DDR" />
          <Chip x={628} y={408} w={26} h={16} label="NAND" />
          <Chip x={598} y={438} w={18} h={14} />
          <rect x="624" y="436" width="30" height="18" fill="#c9cbd0" stroke="#666" />
          <T x={639} y={448} s={4.6} fill="#333">SHIELD</T>
          <circle cx="600" cy="338" r="3" fill="url(#gBrass)" />
          <circle cx="652" cy="338" r="3" fill="url(#gBrass)" />
          <rect x="598" y="462" width="56" height="8" fill="#d9a441" stroke="#7a5a22" />
          <circle cx="652" cy="470" r="2" fill="#ff6b57" />
        </g>
      ),
    },
    {
      id: "battery",
      name: "Li-ion battery",
      layer: "muscle",
      cx: 715,
      cy: 405,
      w: 37,
      h: 65,
      ps: 1.65,
      blurb: "Two cells in a rigid pack that slides into the grip. Enough for ~500 shots — or an afternoon of video.",
      detail:
        "The pack talks to the camera through its contacts: charge state, cycle count and temperature. The camera refuses to use an unknown pack if it is too hot or too worn — a safety feature.",
      specs: [
        ["Capacity", "2200 mAh"],
        ["Voltage", "7.2 V"],
        ["Energy", "15.8 Wh"],
      ],
      render: () => (
        <g>
          <rect x="678" y="340" width="74" height="130" rx="8" fill="url(#gDark)" stroke="#000" strokeWidth="1.3" />
          <rect x="684" y="346" width="62" height="118" rx="5" fill="#ececf0" stroke="#888" />
          <rect x="684" y="346" width="62" height="26" rx="5" fill="#2a4fbf" />
          <T x={715} y={364} s={9} fill="#fff" w={800} f="Inter, sans-serif" ls={1}>LITHIUM</T>
          <T x={715} y={388} s={7} fill="#222" w={700}>7.2V · 2200mAh</T>
          <T x={715} y={398} s={5.4} fill="#555">15.8Wh · NP-M1</T>
          {[0, 1].map((i) => (
            <rect key={i} x={690 + i * 30} y="408" width="26" height="36" rx="13" fill="#b9bdc4" stroke="#666" />
          ))}
          <T x={715} y={456} s={5} fill="#c22" w={700}>⚠ RECHARGEABLE</T>
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={688 + i * 14} y="466" width="9" height="7" fill="url(#gBrass)" stroke="#5b4214" />
          ))}
          <rect x="678" y="340" width="74" height="6" rx="3" fill="rgba(255,255,255,.2)" />
        </g>
      ),
    },
    {
      id: "lcd",
      name: "Rear LCD",
      layer: "muscle",
      cx: LX,
      cy: 405,
      w: 80,
      h: 54,
      ps: 1.3,
      dyn: true,
      blurb: "A 3-inch touchscreen on a hinge, showing a histogram, a focus frame and everything the sensor sees.",
      detail:
        "What you see is the sensor's live feed, processed to look like the final image. The histogram counts pixels by brightness so you can judge exposure by looking at a graph rather than trusting your eyes in the sun.",
      specs: [
        ["Size", "3.0″ · 1.62 M dots"],
        ["Touch", "Capacitive"],
        ["Hinge", "Tilting"],
      ],
      render: ({ spin }) => {
        const bars = Array.from({ length: 22 }).map((_, i) => 4 + Math.abs(Math.sin(i * 0.55 + spin * 0.02)) * 18 + (i > 14 ? -3 : 0));
        return (
          <g>
            <linearGradient id="mc-lcd" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2a4a78" />
              <stop offset=".55" stopColor="#d98a5a" />
              <stop offset="1" stopColor="#3a2a32" />
            </linearGradient>
            <rect x="388" y="349" width="164" height="112" rx="8" fill="#070708" stroke="#666" strokeWidth="1.3" />
            <rect x="394" y="355" width="152" height="100" rx="3" fill="url(#mc-lcd)" />
            <path d="M394 420Q430 398 470 416T546 404V455H394Z" fill="#14101a" opacity=".6" />
            {[0, 1].map((i) => (
              <g key={i}>
                <line x1={394 + 50.6 * (i + 1)} x2={394 + 50.6 * (i + 1)} y1="355" y2="455" stroke="#fff" strokeOpacity=".16" />
                <line x1="394" x2="546" y1={355 + 33.3 * (i + 1)} y2={355 + 33.3 * (i + 1)} stroke="#fff" strokeOpacity=".16" />
              </g>
            ))}
            <g stroke="#58f08a" strokeWidth="1.4" fill="none">
              <path d="M450 388V382H456M484 382H490V388M490 402V408H484M456 408H450V402" />
            </g>
            <rect x="394" y="355" width="152" height="12" fill="rgba(0,0,0,.55)" />
            <T x={400} y={364} s={5.8} fill="#fff" anchor="start">1/250 f/2.8 ISO200 ±0</T>
            <T x={540} y={364} s={5.4} fill="#58f08a" anchor="end" w={700}>RAW</T>
            <rect x="494" y="422" width="48" height="28" fill="rgba(0,0,0,.6)" />
            {bars.map((b, i) => (
              <rect key={i} x={496 + i * 2.1} y={448 - b} width="1.6" height={b} fill="#e8e8e8" />
            ))}
            <rect x="398" y="443" width="16" height="7" rx="1.5" fill="none" stroke="#fff" />
            <rect x="399.5" y="444.5" width="10" height="4" fill="#58f08a" />
            <rect x="394" y="355" width="152" height="30" fill="url(#gGloss)" opacity=".3" />
            <rect x="380" y="380" width="8" height="18" rx="2" fill="url(#gMetalH)" stroke="#333" />
            <rect x="380" y="412" width="8" height="18" rx="2" fill="url(#gMetalH)" stroke="#333" />
          </g>
        );
      },
    },
    {
      id: "optics",
      name: "Lens optics & AF motor",
      layer: "muscle",
      cx: LX,
      cy: LY,
      w: 66,
      h: 66,
      ps: 1.3,
      dyn: true,
      blurb: "Nine elements with two aspherical surfaces, driven by a silent linear motor that can refocus 120× a second.",
      detail:
        "Two of the nine elements are ground to a non-spherical shape that cancels the colour fringing and blur a simple curve can't. The copper ring is the motor coil — magnets slide the focusing group with a whisper.",
      specs: [
        ["Elements", "9 in 7 groups"],
        ["ASPH", "2 elements"],
        ["AF motor", "Linear, 0.03 s"],
      ],
      render: ({ spin }) => (
        <g>
          <circle cx={LX} cy={LY} r="66" fill="#0b0b0c" stroke="#555" />
          <circle cx={LX} cy={LY} r="62" fill="none" stroke="url(#gCopper)" strokeWidth="5" strokeDasharray="6 2" />
          <LensGlass cx={LX} cy={LY} r={58} rot={spin * 0.05} />
          <rect x={LX - 20} y={LY + 38} width="40" height="11" rx="5.5" fill="rgba(10,10,16,.75)" stroke="#9fd8ff" strokeOpacity=".5" />
          <T x={LX} y={LY + 46} s={5.4} fill="#9fd8ff" ls={1.2} w={700}>ASPH ×2</T>
        </g>
      ),
    },
    {
      id: "evf",
      name: "Electronic viewfinder",
      layer: "muscle",
      cx: LX,
      cy: 258,
      w: 50,
      h: 21,
      ps: 2.3,
      blurb: "A 0.5-inch OLED screen and a magnifying eyepiece that show you a tiny, bright copy of the world.",
      detail:
        "The panel has 5.76 million dots, each self-lit. A sensor by the eyecup turns the display on when you lift the camera, and swaps off the rear LCD so the glow doesn't spoil your night vision.",
      specs: [
        ["Panel", "0.5″ OLED"],
        ["Dots", "5.76 M"],
        ["Mag.", "0.78×"],
      ],
      render: () => (
        <g>
          <rect x="420" y="238" width="100" height="40" rx="10" fill="#0c0c0e" stroke="#666" />
          <rect x="426" y="243" width="34" height="30" rx="3" fill="#050608" stroke="#7aa2ff" strokeOpacity=".6" />
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={i} x1={428 + i * 3.6} x2={428 + i * 3.6} y1="245" y2="271" stroke="#7aa2ff" strokeOpacity=".35" strokeWidth=".6" />
          ))}
          <rect x="430" y="250" width="26" height="16" fill="#7aa2ff" opacity=".25" />
          <circle cx="488" cy="258" r="15" fill="url(#gCoatP)" stroke="#9fd8ff" strokeOpacity=".5" />
          <circle cx="488" cy="258" r="9" fill="url(#gCoatG)" stroke="#9fd8ff" strokeOpacity=".5" />
          <circle cx="488" cy="258" r="3.5" fill="url(#gGlass)" />
          <circle cx="510" cy="247" r="3.5" fill="#ff6b57" />
          <circle cx="510" cy="247" r="5" fill="url(#gLed)" opacity=".6" />
          <rect x="422" y="240" width="96" height="6" rx="3" fill="url(#gGloss)" />
          <Knurl cx={510} cy={268} r={4} w={2} dash="1 1" c="#999" o={0.8} />
        </g>
      ),
    },

    /* ── skin ── */
    {
      id: "cover",
      name: "Front cover & grip",
      layer: "skin",
      cx: 507,
      cy: 400,
      w: 267,
      h: 100,
      ps: 0.72,
      blurb: "A rubberised front cover with a deep, sculpted grip. It also seals against dust and rain.",
      detail:
        "Beneath the texture there's a gasket at every seam. The front dial under your index finger controls aperture, while the amber lamp helps the autofocus see in the dark.",
      specs: [
        ["Material", "Rubber + PC"],
        ["Seals", "42 points"],
        ["Grip texture", "Micro-diamond"],
      ],
      render: () => (
        <g>
          <path
            fillRule="evenodd"
            d={`M256 300H744Q775 300 775 332V468Q775 500 744 500H256Q240 500 240 484V316Q240 300 256 300Z M${LX + 112} ${LY}a112 112 0 1 0 -224 0a112 112 0 1 0 224 0Z`}
            fill="url(#gDark)"
            stroke="#000"
            strokeWidth="1.5"
          />
          <path d="M628 300H744Q775 300 775 332V468Q775 500 744 500H628Z" fill="url(#pGrip)" stroke="#000" />
          <path d="M628 300V500" stroke="#ff6b57" strokeWidth="2" />
          <path d="M250 312Q250 306 256 306H620" fill="none" stroke="rgba(255,255,255,.16)" />
          <circle cx="706" cy="334" r="13" fill="url(#gMetalH)" stroke="#222" />
          <Knurl cx={706} cy={334} r={11} w={4} dash="1 1.5" c="#333" o={0.8} />
          <circle cx="706" cy="334" r="5" fill="url(#gDark)" />
          <circle cx="610" cy="326" r="5.5" fill="#ffb347" stroke="#7a4a10" />
          <circle cx="610" cy="326" r="8" fill="url(#gLed)" opacity=".35" />
          <circle cx="598" cy="384" r="8" fill="url(#gChrome)" stroke="#222" />
          <T x={598} y={402} s={4.4} fill="#999" ls={1}>LENS</T>
          <T x={290} y={326} s={10} fill="#e9e9ec" w={800} ls={3} f="Inter, sans-serif" anchor="middle">MERIDIAN</T>
          <T x={290} y={476} s={5.4} fill="#777" ls={2} anchor="middle">M-CSC · 61MP</T>
          {Array.from({ length: 5 }).map((_, i) => (
            <circle key={i} cx={262 + i * 6} cy={344} r="1.4" fill="#000" />
          ))}
          <path d="M700 380Q720 420 700 470" stroke="rgba(255,255,255,.07)" strokeWidth="14" fill="none" />
        </g>
      ),
    },
    {
      id: "top",
      name: "Top plate & dials",
      layer: "skin",
      cx: 500,
      cy: 264,
      w: 260,
      h: 38,
      ps: 0.78,
      blurb: "CNC-machined silver top with a mode dial, an exposure-compensation dial and a shutter button that's a joy to press.",
      detail:
        "The dials click against spring-loaded ball bearings; each detent corresponds to a switch on a flex PCB underneath. The hot shoe on the hump carries flash, microphones and, with the right adapter, a cine monitor.",
      specs: [
        ["Material", "Machined Al"],
        ["Dials", "2 + button"],
        ["Hot shoe", "Multi-interface"],
      ],
      render: () => (
        <g>
          <rect x="240" y="266" width="520" height="36" rx="6" fill="url(#gChrome)" stroke="#2c2c2f" strokeWidth="1.4" />
          <path d="M398 268L412 234H528L542 268Z" fill="url(#gChrome)" stroke="#2c2c2f" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M420 244H520" stroke="#fff" strokeWidth="1.4" strokeOpacity=".85" />
          <rect x="440" y="225" width="60" height="9" rx="2" fill="url(#gBrass)" stroke="#4a3810" />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx={450 + i * 10} cy={229.5} r="1.6" fill="#2a1f08" />
          ))}
          <T x={470} y={262} s={6.2} fill="#222" ls={2.6} w={800} f="Inter, sans-serif">MERIDIAN</T>
          {/* mode dial */}
          <rect x="262" y="246" width="78" height="22" rx="4" fill="url(#gMetalH)" stroke="#333" />
          <rect x="262" y="246" width="78" height="6" rx="3" fill="url(#pKnurl)" />
          {["P", "A", "S", "M", "▣", "◐"].map((c, i) => (
            <T key={i} x={272 + i * 12.6} y={264} s={6} fill={c === "M" ? "#d22" : "#1a1a1a"} w={800}>{c}</T>
          ))}
          <rect x="296" y="244" width="6" height="5" fill="#e8502a" />
          {/* exposure comp */}
          <rect x="586" y="248" width="82" height="20" rx="4" fill="url(#gMetalH)" stroke="#333" />
          <rect x="586" y="248" width="82" height="5" rx="3" fill="url(#pKnurl)" />
          {["3", "2", "1", "0", "1", "2", "3"].map((c, i) => (
            <T key={i} x={594 + i * 11.8} y={264} s={5.6} fill={i === 3 ? "#d22" : "#1a1a1a"} w={800}>{c}</T>
          ))}
          {/* shutter + power */}
          <circle cx="716" cy="262" r="17" fill="url(#gMetalH)" stroke="#333" />
          <circle cx="716" cy="262" r="12" fill="none" stroke="#222" strokeWidth="3" />
          <ellipse cx="716" cy="256" rx="8" ry="4" fill="url(#gChrome)" stroke="#333" />
          <circle cx="740" cy="284" r="6" fill="url(#gBtnRed)" stroke="#000" />
          {/* mics */}
          {Array.from({ length: 10 }).map((_, i) => (
            <circle key={i} cx={352 + (i % 5) * 6} cy={274 + Math.floor(i / 5) * 6} r="1.6" fill="#111" />
          ))}
          <T x={420} y={292} s={5} fill="#333" ls={1.6}>STEREO MIC</T>
          {[256, 744, 380, 620].map((x, i) => (
            <Screw key={x} x={x} y={294} r={3.4} a={i * 37} />
          ))}
        </g>
      ),
    },
    {
      id: "barrel",
      name: "Lens barrel",
      layer: "skin",
      cx: LX,
      cy: LY,
      w: 106,
      h: 106,
      ps: 0.82,
      dyn: true,
      blurb: "A fast 35 mm prime: rubber focus ring, clicking aperture ring, and a silver trim ring.",
      detail:
        "The aperture ring has a click per third of a stop, so you can change it in the dark. The focus ring is electronic — it sends pulses to the motor rather than moving glass — which is why it feels the same at every distance.",
      specs: [
        ["Lens", "35 mm f/1.4"],
        ["Filter", "Ø 49 mm"],
        ["Weight", "340 g"],
      ],
      render: ({ spin }) => (
        <g>
          <circle cx={LX} cy={LY} r="86" fill="none" stroke="url(#gDark)" strokeWidth="40" />
          <circle cx={LX} cy={LY} r="106" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1.5" />
          <g transform={`rotate(${spin * 0.04} ${LX} ${LY})`}>
            <circle cx={LX} cy={LY} r="95" fill="none" stroke="#19191b" strokeWidth="18" />
            <Knurl cx={LX} cy={LY} r={96} w={14} dash="2.4 2.6" c="#3a3a3f" o={1} />
            <Knurl cx={LX} cy={LY} r={96} w={14} dash="0.6 4.4" c="#777" o={0.6} />
          </g>
          <circle cx={LX} cy={LY} r="82" fill="none" stroke="url(#gChrome)" strokeWidth="4" />
          <circle cx={LX} cy={LY} r="76" fill="none" stroke="#0a0a0b" strokeWidth="9" />
          <Knurl cx={LX} cy={LY} r={76} w={6} dash="1.2 2.4" c="#8a8a90" o={0.6} />
          <path id="mc-ap" d={`M${LX - 70} ${LY}a70 70 0 1 1 140 0a70 70 0 1 1 -140 0`} fill="none" />
          <text fontSize="6" fontFamily="JetBrains Mono, monospace" fill="#ddd" fontWeight="700" letterSpacing="2.8">
            <textPath href="#mc-ap" startOffset="0">1.4 · 2 · 2.8 · 4 · 5.6 · 8 · 11 · 16 · A · 1.4 · 2 · 2.8 · 4</textPath>
          </text>
          <circle cx={LX} cy={LY} r="66" fill="none" stroke="url(#gChrome)" strokeWidth="3" />
          <path id="mc-eng" d={`M${LX - 61} ${LY}a61 61 0 1 1 122 0a61 61 0 1 1 -122 0`} fill="none" />
          <text fontSize="5.8" fontFamily="JetBrains Mono, monospace" fill="#e8e8e8" fontWeight="700" letterSpacing="1.5">
            <textPath href="#mc-eng" startOffset="6">MERIDIAN M 35mm 1:1.4 ASPH · Ø49 · Nº 9031822 ·</textPath>
          </text>
          <circle cx={LX - 60} cy={LY - 78} r="3.6" fill="#d22" />
        </g>
      ),
    },
  ],
};
