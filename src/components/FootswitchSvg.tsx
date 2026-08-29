import React from 'react';

interface FootswitchSvgProps {
  pressed: boolean;
  width?: string | number;
  height?: string | number;
}

/**
 * Footswitch Zoom G6 / G11 Treadle Rocker (Largo / Extenso Lateralmente):
 * - Ocupa quase 100% da largura da coluna do preset.
 * - Formato trapezoidal/triangular característico da Zoom G6 (mais largo no topo, estreitando suavemente no pivot inferior).
 * - Moldura chanfrada em grafite escuro com parafusos sextavados industriais.
 * - Superfície antiderrapante em grafite/carbono fosco com 5 frisos de aço escovado metálico usinado.
 * - Efeito de pressão mecânica ao clicar/segurar.
 */
export const FootswitchSvg: React.FC<FootswitchSvgProps> = ({
  pressed,
  width = '100%',
  height = '100%',
}) => {
  const tiltDy = pressed ? 3 : 0;
  const tiltScaleY = pressed ? 0.96 : 1;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 160 88"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="select-none pointer-events-none w-full h-full"
    >
      <defs>
        {/* Sombra de oclusão ampla sob o pedal */}
        <radialGradient id="g6-wide-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="50%" stopColor="#000000" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Moldura externa chanfrada em grafite escuro fosco */}
        <linearGradient id="g6-wide-frame" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2c3340" />
          <stop offset="25%" stopColor="#1a1e27" />
          <stop offset="70%" stopColor="#10131a" />
          <stop offset="100%" stopColor="#07090c" />
        </linearGradient>

        {/* Chanfro metálico de reflexo da moldura */}
        <linearGradient id="g6-wide-bevel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        {/* Superfície do pedal basculante em carbono / grafite */}
        <linearGradient id="g6-wide-treadle" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={pressed ? '#252b36' : '#38414f'} />
          <stop offset="25%" stopColor={pressed ? '#1a1f28' : '#272d38'} />
          <stop offset="60%" stopColor={pressed ? '#12151d' : '#191e27'} />
          <stop offset="100%" stopColor={pressed ? '#0a0c10' : '#0e1117'} />
        </linearGradient>

        {/* Frisos de tração e aço escovado metálico usinado */}
        <linearGradient id="g6-wide-groove" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e242f" />
          <stop offset="15%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="85%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#1e242f" />
        </linearGradient>

        {/* Parafusos Allen nos cantos */}
        <linearGradient id="g6-wide-screw" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* 1. Sombra projetada na base */}
      <polygon
        points="8,6 152,6 136,84 24,84"
        fill="url(#g6-wide-shadow)"
      />

      {/* 2. Moldura externa chanfrada trapezoidal/triangular larga */}
      <path
        d="M 12 4 L 148 4 C 154 4, 157 7, 155 12 L 134 78 C 132 83, 128 86, 122 86 L 38 86 C 32 86, 28 83, 26 78 L 5 12 C 3 7, 6 4, 12 4 Z"
        fill="url(#g6-wide-frame)"
        stroke="#05070a"
        strokeWidth="1.5"
      />
      {/* Filete de reflexo metálico chanfrado */}
      <path
        d="M 13.5 6 L 146.5 6 C 151.5 6, 154 8, 152.5 12 L 132.5 76 C 131 80, 127.5 83, 122 83 L 38 83 C 32.5 83, 29 80, 27.5 76 L 7.5 12 C 6 8, 8.5 6, 13.5 6 Z"
        fill="none"
        stroke="url(#g6-wide-bevel)"
        strokeWidth="1"
        strokeOpacity="0.6"
      />

      {/* Parafusos nos cantos da moldura */}
      <circle cx="15" cy="10" r="2.2" fill="url(#g6-wide-screw)" />
      <circle cx="145" cy="10" r="2.2" fill="url(#g6-wide-screw)" />
      <circle cx="39" cy="80" r="2" fill="url(#g6-wide-screw)" />
      <circle cx="121" cy="80" r="2" fill="url(#g6-wide-screw)" />

      {/* Cavidade interna rebaixada escura */}
      <path
        d="M 16 12 L 144 12 C 147 12, 148 14, 146.5 17 L 128.5 71 C 127 74, 124 76, 119 76 L 41 76 C 36 76, 33 74, 31.5 71 L 13.5 17 C 12 14, 13 12, 16 12 Z"
        fill="#06080b"
        stroke="#000000"
        strokeWidth="1.2"
      />

      {/* 3. Pedal Basculante Trapezoidal Móvel (Largo Zoom G6) */}
      <g
        transform={`translate(0, ${tiltDy}) scale(1, ${tiltScaleY})`}
        style={{ transformOrigin: '80px 44px', transition: 'transform 45ms ease-out' }}
      >
        {/* Sombra sob o pedal móvel */}
        <path
          d="M 19 15 L 141 15 L 125 69 L 35 69 Z"
          fill="#000000"
          fillOpacity={pressed ? 0.95 : 0.6}
        />

        {/* Corpo do pedal em grafite/carbono escuro */}
        <path
          d="M 20 14 L 140 14 C 143 14, 144.5 15.5, 143 18 L 126 67 C 124.5 70, 121.5 71.5, 117.5 71.5 L 42.5 71.5 C 38.5 71.5, 35.5 70, 34 67 L 17 18 C 15.5 15.5, 17 14, 20 14 Z"
          fill="url(#g6-wide-treadle)"
          stroke="#0f131a"
          strokeWidth="1"
        />

        {/* Borda superior de reflexo especular do pedal */}
        <path
          d="M 21 15.5 L 139 15.5 C 141 15.5, 142 16.5, 141 18 L 124.5 65.5 C 123.5 68, 121 69.5, 117.5 69.5 L 42.5 69.5 C 39 69.5, 36.5 68, 35.5 65.5 L 19 18 C 18 16.5, 19 15.5, 21 15.5 Z"
          fill="none"
          stroke="#ffffff"
          strokeOpacity={pressed ? 0.12 : 0.45}
          strokeWidth="0.8"
        />

        {/* 4. Frisos de tração e aço escovado adaptados à extensão ampla */}
        <g strokeLinecap="round">
          {/* Friso 1 (Topo largo) */}
          <rect x="28" y="21" width="104" height="3.5" rx="1.5" fill="#0c0f14" stroke="#000000" strokeWidth="0.5" />
          <rect x="29" y="21.5" width="102" height="2" rx="1" fill="url(#g6-wide-groove)" opacity={pressed ? 0.6 : 0.95} />

          {/* Friso 2 */}
          <rect x="32" y="30" width="96" height="3.5" rx="1.5" fill="#0c0f14" stroke="#000000" strokeWidth="0.5" />
          <rect x="33" y="30.5" width="94" height="2" rx="1" fill="url(#g6-wide-groove)" opacity={pressed ? 0.6 : 0.95} />

          {/* Friso 3 (Central usinado) */}
          <rect x="36" y="39" width="88" height="4" rx="2" fill="#0c0f14" stroke="#000000" strokeWidth="0.5" />
          <rect x="37" y="39.5" width="86" height="2.5" rx="1.2" fill="url(#g6-wide-groove)" opacity={pressed ? 0.7 : 1} />

          {/* Friso 4 */}
          <rect x="40" y="48" width="80" height="3.5" rx="1.5" fill="#0c0f14" stroke="#000000" strokeWidth="0.5" />
          <rect x="41" y="48.5" width="78" height="2" rx="1" fill="url(#g6-wide-groove)" opacity={pressed ? 0.6 : 0.95} />

          {/* Friso 5 (Base) */}
          <rect x="44" y="57" width="72" height="3.5" rx="1.5" fill="#0c0f14" stroke="#000000" strokeWidth="0.5" />
          <rect x="45" y="57.5" width="70" height="2" rx="1" fill="url(#g6-wide-groove)" opacity={pressed ? 0.6 : 0.95} />
        </g>

        {/* Pivot mecânico inferior */}
        <circle cx="80" cy="66" r="1.8" fill="#475569" />
      </g>
    </svg>
  );
};
