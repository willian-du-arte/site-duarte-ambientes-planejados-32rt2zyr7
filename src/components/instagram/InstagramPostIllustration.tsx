/**
 * InstagramPostIllustration — cozinha planejada sob medida em MDF, ilustração vetorial (SVG inline).
 *
 * O post é 1080x1080. A cena mostra: armários superiores e inferiores até o teto, ilha com
 * banquetas, despensa embutida com prateleiras, coifa sobre o cooktop, pia com torneira,
 * paleta de 3 cores (verde sage, carvalho, off-white), gradientes e profundidade.
 * Marca e CTA ficam numa faixa externa à cena, sem texto sobre a ilustração.
 */

const SAGE_DARK = '#5C7160'
const SAGE = '#829B85'
const SAGE_LIGHT = '#A7BCA6'
const SAGE_PALE = '#D5DFD2'
const OAK = '#C79A6D'
const OAK_DARK = '#8F5826'
const OAK_LIGHT = '#EAD7C2'
const CREAM = '#F7F1E6'
const SHADOW = '#2E1F12'

export function InstagramPostIllustration() {
  return (
    <svg
      viewBox="0 0 1080 1080"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Ilustração de cozinha planejada sob medida em MDF"
      className="block h-auto w-full"
    >
      <defs>
        <linearGradient id="ig-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF9EE" />
          <stop offset="1" stopColor="#EFE2CC" />
        </linearGradient>
        <linearGradient id="ig-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#DFC2A3" />
          <stop offset="1" stopColor="#C79A6D" />
        </linearGradient>
        <linearGradient id="ig-sage-door" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A7BCA6" />
          <stop offset="1" stopColor="#6E8570" />
        </linearGradient>
        <linearGradient id="ig-sage-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5C7160" />
          <stop offset="1" stopColor="#46574A" />
        </linearGradient>
        <linearGradient id="ig-oak-door" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#EAD7C2" />
          <stop offset="1" stopColor="#C79A6D" />
        </linearGradient>
        <linearGradient id="ig-counter" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.65" stopColor="#F1E7D6" />
          <stop offset="1" stopColor="#D8C6AC" />
        </linearGradient>
        <linearGradient id="ig-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F4F9F3" />
          <stop offset="1" stopColor="#C4D6C5" />
        </linearGradient>
        <linearGradient id="ig-chrome" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9CA3AF" />
          <stop offset="0.5" stopColor="#E5E7EB" />
          <stop offset="1" stopColor="#9CA3AF" />
        </linearGradient>
        <linearGradient id="ig-steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#B9BFC9" />
          <stop offset="0.5" stopColor="#F2F4F7" />
          <stop offset="1" stopColor="#9CA3AF" />
        </linearGradient>
        <linearGradient id="ig-window" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EAF4EF" />
          <stop offset="1" stopColor="#CFE3D4" />
        </linearGradient>
        <radialGradient id="ig-glow" cx="0.5" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#FFFDF6" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFFDF6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ig-vignette" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={SHADOW} stopOpacity="0.12" />
          <stop offset="0.18" stopColor={SHADOW} stopOpacity="0" />
          <stop offset="0.82" stopColor={SHADOW} stopOpacity="0" />
          <stop offset="1" stopColor={SHADOW} stopOpacity="0.18" />
        </linearGradient>
      </defs>

      {/* Fundo: parede, piso, brilho e vinheta */}
      <rect width="1080" height="1080" fill="url(#ig-wall)" />
      <rect y="880" width="1080" height="200" fill="url(#ig-floor)" />
      <g stroke={OAK_DARK} strokeOpacity="0.22" strokeWidth="3">
        <line x1="0" y1="940" x2="1080" y2="940" />
        <line x1="0" y1="1010" x2="1080" y2="1010" />
        <line x1="140" y1="880" x2="100" y2="940" />
        <line x1="460" y1="880" x2="430" y2="940" />
        <line x1="790" y1="880" x2="770" y2="940" />
        <line x1="300" y1="940" x2="260" y2="1010" />
        <line x1="660" y1="940" x2="630" y2="1010" />
        <line x1="960" y1="940" x2="940" y2="1010" />
      </g>
      <rect width="1080" height="1080" fill="url(#ig-glow)" />
      <rect width="1080" height="1080" fill="url(#ig-vignette)" />

      {/* ===== Faixa superior de armários (até o teto) ===== */}
      <g>
        <rect x="60" y="70" width="300" height="150" rx="10" fill="url(#ig-sage-door)" />
        <circle cx="345" cy="145" r="7" fill={CREAM} />
        <rect x="378" y="70" width="190" height="150" rx="10" fill="url(#ig-oak-door)" />
        <circle cx="555" cy="145" r="7" fill={SAGE_PALE} />
        <rect x="586" y="70" width="170" height="150" rx="10" fill="url(#ig-sage-door)" />
        <circle cx="600" cy="145" r="7" fill={CREAM} />
        <rect x="774" y="70" width="246" height="150" rx="10" fill="url(#ig-oak-door)" />
        <circle cx="805" cy="145" r="7" fill={SAGE_PALE} />
      </g>

      {/* ===== Faixa média: coifa + armário de vidro ===== */}
      <g>
        <rect x="282" y="280" width="96" height="34" rx="8" fill={SAGE_DARK} />
        <path d="M 300 285 L 300 225 L 360 225 L 360 285 Z" fill={SAGE_DARK} />
        <rect x="312" y="305" width="36" height="6" rx="3" fill={SHADOW} opacity="0.35" />
        <rect x="396" y="225" width="170" height="95" rx="10" fill="url(#ig-sage-door)" />
        <rect x="410" y="239" width="142" height="67" rx="7" fill="url(#ig-glass)" />
        <rect x="586" y="225" width="170" height="95" rx="10" fill="url(#ig-oak-door)" />
        <rect x="774" y="225" width="246" height="95" rx="10" fill="url(#ig-sage-door)" />
        <circle cx="790" cy="272" r="7" fill={CREAM} />
        <circle cx="1006" cy="272" r="7" fill={CREAM} />
        <circle cx="600" cy="272" r="7" fill={SAGE_PALE} />
      </g>

      {/* ===== Backsplash + bancada + armários inferiores ===== */}
      <g>
        <rect x="60" y="320" width="960" height="90" fill={CREAM} />
        <rect x="60" y="320" width="960" height="90" fill="url(#ig-glass)" opacity="0.35" />
        <g stroke={SAGE_DARK} strokeOpacity="0.18" strokeWidth="2">
          <line x1="240" y1="320" x2="240" y2="410" />
          <line x1="420" y1="320" x2="420" y2="410" />
          <line x1="600" y1="320" x2="600" y2="410" />
          <line x1="780" y1="320" x2="780" y2="410" />
        </g>

        <rect x="48" y="410" width="984" height="34" rx="10" fill="url(#ig-counter)" />
        <rect x="48" y="438" width="984" height="6" fill={SHADOW} opacity="0.10" />

        {/* armários inferiores */}
        <rect x="60" y="444" width="300" height="220" rx="10" fill="url(#ig-sage-dark)" />
        <rect x="66" y="450" width="288" height="208" rx="8" fill="url(#ig-sage-door)" />
        <rect x="342" y="444" width="192" height="220" rx="10" fill="url(#ig-oak-door)" />
        <rect x="348" y="450" width="180" height="208" rx="8" fill="url(#ig-oak-door)" />
        <rect
          x="348"
          y="450"
          width="180"
          height="208"
          rx="8"
          fill="none"
          stroke={SHADOW}
          strokeOpacity="0.10"
          strokeWidth="2"
        />
        <rect x="540" y="444" width="240" height="220" rx="10" fill="url(#ig-sage-dark)" />
        <rect x="546" y="450" width="228" height="208" rx="8" fill="url(#ig-sage-door)" />
        <rect x="786" y="444" width="234" height="220" rx="10" fill="url(#ig-sage-dark)" />
        <rect x="792" y="450" width="222" height="208" rx="8" fill="url(#ig-sage-door)" />
        <circle cx="336" cy="554" r="7" fill={CREAM} />
        <circle cx="360" cy="554" r="7" fill={CREAM} />
        <circle cx="520" cy="554" r="7" fill={CREAM} />
        <circle cx="550" cy="554" r="7" fill={CREAM} />
        <circle cx="776" cy="554" r="7" fill={CREAM} />
      </g>

      {/* ===== Cooktop com panela e vapor ===== */}
      <g>
        <rect x="120" y="404" width="180" height="14" rx="7" fill={SAGE_DARK} />
        <circle cx="160" cy="411" r="30" fill={SHADOW} opacity="0.12" />
        <circle cx="260" cy="411" r="30" fill={SHADOW} opacity="0.12" />
        <circle
          cx="160"
          cy="411"
          r="26"
          fill={SAGE_PALE}
          stroke={SHADOW}
          strokeOpacity="0.25"
          strokeWidth="2"
        />
        <circle
          cx="260"
          cy="411"
          r="26"
          fill={SAGE_PALE}
          stroke={SHADOW}
          strokeOpacity="0.25"
          strokeWidth="2"
        />
        <rect x="126" y="352" width="68" height="28" rx="10" fill="url(#ig-steel)" />
        <rect x="126" y="352" width="68" height="9" rx="4" fill="#E5E7EB" />
        <ellipse cx="160" cy="352" rx="34" ry="8" fill="url(#ig-chrome)" />
        <ellipse cx="160" cy="326" rx="18" ry="26" fill="#FFFFFF" opacity="0.45" />
        <ellipse cx="160" cy="300" rx="24" ry="34" fill="#FFFFFF" opacity="0.25" />
      </g>

      {/* ===== Pia com torneira ===== */}
      <g>
        <rect x="620" y="414" width="230" height="12" rx="6" fill={SHADOW} opacity="0.14" />
        <rect x="620" y="414" width="230" height="10" rx="5" fill={SAGE_PALE} />
        <path
          d="M 735 414 L 735 372 Q 735 358 750 358 L 766 358"
          fill="none"
          stroke="url(#ig-chrome)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <rect x="764" y="358" width="12" height="26" rx="6" fill="url(#ig-chrome)" />
        <rect x="726" y="398" width="18" height="8" rx="4" fill="url(#ig-chrome)" />
      </g>

      {/* ===== Itens de bancada ===== */}
      <g>
        <rect x="452" y="360" width="22" height="48" rx="9" fill={SAGE_DARK} />
        <rect x="458" y="348" width="10" height="14" rx="4" fill={OAK_DARK} />
        <rect x="482" y="366" width="90" height="44" rx="10" fill={OAK} />
        <rect x="482" y="366" width="90" height="10" rx="5" fill={OAK_LIGHT} />
        <rect x="590" y="374" width="14" height="36" rx="7" fill={OAK_DARK} />
        <rect x="610" y="366" width="14" height="44" rx="7" fill={SAGE} />
      </g>

      {/* ===== Ilha central com banquetas e vaso ===== */}
      <g>
        <ellipse cx="540" cy="1000" rx="330" ry="36" fill={SHADOW} opacity="0.12" />
        <rect x="250" y="640" width="580" height="290" rx="14" fill="url(#ig-sage-door)" />
        <rect x="270" y="660" width="540" height="80" rx="12" fill="url(#ig-oak-door)" />
        <rect x="270" y="756" width="540" height="80" rx="12" fill="url(#ig-oak-door)" />
        <rect x="480" y="694" width="120" height="9" rx="4.5" fill={SAGE_DARK} />
        <rect x="480" y="790" width="120" height="9" rx="4.5" fill={SAGE_DARK} />
        <rect x="230" y="608" width="620" height="40" rx="12" fill="url(#ig-counter)" />
        <rect x="230" y="640" width="620" height="8" fill={SHADOW} opacity="0.08" />
        <rect
          x="120"
          y="760"
          width="110"
          height="120"
          rx="12"
          fill="url(#ig-oak-door)"
          stroke={OAK_DARK}
          strokeOpacity="0.25"
          strokeWidth="2"
        />
        <rect x="120" y="760" width="110" height="14" rx="7" fill={OAK_LIGHT} />
        <rect
          x="850"
          y="760"
          width="110"
          height="120"
          rx="12"
          fill="url(#ig-oak-door)"
          stroke={OAK_DARK}
          strokeOpacity="0.25"
          strokeWidth="2"
        />
        <rect x="850" y="760" width="110" height="14" rx="7" fill={OAK_LIGHT} />
        <path d="M 505 608 L 575 608 L 562 560 Q 540 552 518 560 Z" fill={CREAM} />
        <rect x="505" y="596" width="70" height="12" rx="6" fill="#E9DCC7" />
        <path
          d="M 540 560 C 540 520 540 500 540 480"
          stroke={SAGE_DARK}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="520" cy="500" rx="24" ry="12" fill={SAGE} transform="rotate(-28 520 500)" />
        <ellipse
          cx="562"
          cy="486"
          rx="24"
          ry="12"
          fill={SAGE_LIGHT}
          transform="rotate(24 562 486)"
        />
        <ellipse cx="540" cy="472" rx="22" ry="11" fill={SAGE} transform="rotate(-8 540 472)" />
      </g>

      {/* ===== Despensa embutida (direita) ===== */}
      <g>
        <rect x="872" y="320" width="148" height="344" rx="10" fill="url(#ig-sage-dark)" />
        <g fill={OAK_LIGHT}>
          <rect x="884" y="400" width="124" height="12" rx="5" />
          <rect x="884" y="484" width="124" height="12" rx="5" />
          <rect x="884" y="568" width="124" height="12" rx="5" />
        </g>
        <rect x="894" y="368" width="40" height="32" rx="8" fill={CREAM} />
        <rect x="942" y="386" width="34" height="24" rx="6" fill={SAGE_PALE} />
        <rect x="894" y="452" width="34" height="32" rx="8" fill={SAGE_PALE} />
        <rect x="936" y="446" width="40" height="38" rx="8" fill={CREAM} />
        <rect x="894" y="536" width="44" height="32" rx="8" fill={CREAM} />
        <rect x="944" y="544" width="30" height="24" rx="6" fill={OAK_LIGHT} />
        <rect x="1016" y="470" width="8" height="44" rx="4" fill={CREAM} />
      </g>

      {/* ===== Janela com planta pendente (esquerda) ===== */}
      <g>
        <rect
          x="80"
          y="560"
          width="90"
          height="110"
          rx="10"
          fill={CREAM}
          stroke={SHADOW}
          strokeOpacity="0.10"
          strokeWidth="2"
        />
        <rect x="86" y="566" width="78" height="98" rx="7" fill="url(#ig-window)" />
        <path d="M 60 560 Q 92 480 124 560 Z" fill={SAGE} />
        <path d="M 74 560 Q 92 502 110 560 Z" fill={SAGE_LIGHT} />
        <path d="M 88 560 Q 92 520 96 560 Z" fill={SAGE_DARK} />
      </g>

      {/* ===== Faixa inferior limpa para marca/CTA ===== */}
      <rect x="0" y="955" width="1080" height="125" fill="url(#ig-vignette)" opacity="0.5" />
    </svg>
  )
}

export default InstagramPostIllustration
