/* Knižnica ilustrácií: čisté ploché 2D vektory, hrubý tmavý obrys, tlmené farby, žiadne 3D efekty.
   Rodič môže ktorúkoľvek ilustráciu nahradiť vlastnou fotografiou. */
(function () {
  'use strict';
  const AL = window.AL;

  const C = {
    ink: '#2F3640', water: '#9CC9E3', waterD: '#6FA8CC', glass: '#EEF6FA', sky: '#CFE3EE',
    skin: '#F2C9A5', red: '#D98C7A', coral: '#E3AE9C', green: '#8DB596', greenD: '#6F9C7A', greenL: '#A9CBA4',
    yellow: '#F2D48F', yellowD: '#D9B25F', brown: '#C49A6C', brownL: '#E6C9A8', brownD: '#8C6446',
    gray: '#C9CDD2', grayL: '#E8E4DC', purple: '#B6A6CF', pink: '#EBB7B7', blue: '#7DA2C1', navy: '#3B5374',
    mouth: '#B5615A', hair: '#B4B8BE',
  };

  const hand = (thumbSide) => `
    <rect x="${thumbSide > 0 ? 18 : -34}" y="-18" width="15" height="40" rx="7.5" transform="rotate(${thumbSide * 32} ${thumbSide > 0 ? 25 : -26} 2)" fill="${C.skin}"/>
    <rect x="-30" y="-58" width="14" height="52" rx="7" fill="${C.skin}"/>
    <rect x="-15" y="-66" width="14" height="60" rx="7" fill="${C.skin}"/>
    <rect x="0" y="-62" width="14" height="56" rx="7" fill="${C.skin}"/>
    <rect x="15" y="-50" width="13" height="44" rx="6.5" fill="${C.skin}"/>
    <path d="M-32 -14 L30 -14 L30 14 Q30 44 -1 44 Q-32 44 -32 14 Z" fill="${C.skin}" stroke="none"/>
    <path d="M-32 -14 L-32 14 Q-32 44 -1 44 Q30 44 30 14 L30 -14"/>`;

  const bubble = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFFFFF" stroke="${C.waterD}" stroke-width="4"/>`;

  /* Kocka v jednoduchej perspektíve: predná stena, vrch a bok */
  const cube = (x, y, s, d, front, top, side) => `
    <path d="M${x} ${y} L${x + d} ${y - d} L${x + s + d} ${y - d} L${x + s} ${y} Z" fill="${top}"/>
    <path d="M${x + s} ${y} L${x + s + d} ${y - d} L${x + s + d} ${y + s - d} L${x + s} ${y + s} Z" fill="${side}"/>
    <rect x="${x}" y="${y}" width="${s}" height="${s}" rx="3" fill="${front}"/>`;

  const face = (o) => `
    <rect x="0" y="0" width="200" height="200" fill="${o.bg}" stroke="none"/>
    ${o.hairBack || ''}
    <path d="M24 204 Q26 150 100 144 Q174 150 176 204 Z" fill="${o.shirt}"/>
    <rect x="86" y="118" width="28" height="30" fill="${C.skin}"/>
    ${o.shirtExtra || ''}
    <ellipse cx="60" cy="96" rx="8" ry="11" fill="${C.skin}"/>
    <ellipse cx="140" cy="96" rx="8" ry="11" fill="${C.skin}"/>
    <ellipse cx="100" cy="92" rx="40" ry="46" fill="${C.skin}"/>
    ${o.hair || ''}
    <path d="M77 80 Q85 76 93 80 M107 80 Q115 76 123 80" stroke-width="4"/>
    <circle cx="85" cy="93" r="5" fill="${C.ink}" stroke="none"/>
    <circle cx="115" cy="93" r="5" fill="${C.ink}" stroke="none"/>
    <circle cx="73" cy="108" r="6" fill="${C.pink}" stroke="none"/>
    <circle cx="127" cy="108" r="6" fill="${C.pink}" stroke="none"/>
    <path d="M87 112 Q100 123 113 112" stroke-width="5"/>
    ${o.extra || ''}`;

  const A = {
    /* ---------- Komunikácia ---------- */
    water: () => `
      <path d="M55 35 L145 35 L135 170 L65 170 Z" fill="${C.glass}" stroke="none"/>
      <path d="M58 78 Q79 70 100 78 T142 78 L135 170 L65 170 Z" fill="${C.water}" stroke="none"/>
      <path d="M58 78 Q79 70 100 78 T142 78" stroke="${C.waterD}" stroke-width="4"/>
      <path d="M75 96 L80 150" stroke="#FFFFFF" stroke-width="7" opacity=".85"/>
      <path d="M55 35 L145 35 L135 170 L65 170 Z"/>`,

    toy: () => `
      <circle cx="72" cy="178" r="14" fill="${C.brown}"/>
      <circle cx="128" cy="178" r="14" fill="${C.brown}"/>
      <ellipse cx="100" cy="146" rx="42" ry="36" fill="${C.brown}"/>
      <ellipse cx="57" cy="138" rx="13" ry="22" transform="rotate(25 57 138)" fill="${C.brown}"/>
      <ellipse cx="143" cy="138" rx="13" ry="22" transform="rotate(-25 143 138)" fill="${C.brown}"/>
      <ellipse cx="100" cy="153" rx="22" ry="19" fill="${C.brownL}" stroke="none"/>
      <circle cx="62" cy="40" r="17" fill="${C.brown}"/>
      <circle cx="138" cy="40" r="17" fill="${C.brown}"/>
      <circle cx="62" cy="40" r="7" fill="${C.brownL}" stroke="none"/>
      <circle cx="138" cy="40" r="7" fill="${C.brownL}" stroke="none"/>
      <circle cx="100" cy="72" r="44" fill="${C.brown}"/>
      <ellipse cx="100" cy="89" rx="21" ry="16" fill="${C.brownL}"/>
      <ellipse cx="100" cy="82" rx="7" ry="5" fill="${C.ink}" stroke="none"/>
      <circle cx="83" cy="64" r="5" fill="${C.ink}" stroke="none"/>
      <circle cx="117" cy="64" r="5" fill="${C.ink}" stroke="none"/>
      <path d="M100 87 L100 94 M92 96 Q100 102 108 96" stroke-width="4"/>`,

    wc: () => `
      <rect x="58" y="22" width="84" height="48" rx="10" fill="#FFFFFF"/>
      <rect x="86" y="34" width="28" height="11" rx="5" fill="${C.grayL}" stroke-width="4"/>
      <rect x="86" y="68" width="28" height="22" fill="#FFFFFF"/>
      <path d="M46 96 Q50 142 80 152 L76 176 L124 176 L120 152 Q150 142 154 96 Z" fill="#FFFFFF"/>
      <ellipse cx="100" cy="96" rx="56" ry="17" fill="#FFFFFF"/>
      <ellipse cx="100" cy="96" rx="38" ry="9" fill="${C.water}" stroke="${C.waterD}" stroke-width="4"/>
      <rect x="68" y="172" width="64" height="12" rx="5" fill="${C.grayL}"/>`,

    food: () => `
      <path d="M16 46 L16 74 M22 46 L22 74 M28 46 L28 74 M16 74 Q16 86 22 86 Q28 86 28 74 M22 86 L22 166"/>
      <ellipse cx="178" cy="66" rx="10" ry="16" fill="${C.grayL}"/>
      <path d="M178 82 L178 166"/>
      <circle cx="100" cy="106" r="62" fill="#FFFFFF"/>
      <circle cx="100" cy="106" r="46" stroke="${C.grayL}" stroke-width="4"/>
      <path d="M100 92 C88 82 70 88 72 108 C73 125 86 136 100 131 C114 136 127 125 128 108 C130 88 112 82 100 92 Z" fill="${C.red}"/>
      <path d="M100 92 Q99 83 103 76" stroke="${C.brownD}"/>
      <path d="M103 82 Q113 72 123 79 Q112 89 103 82 Z" fill="${C.green}" stroke-width="4"/>`,

    help: () => `
      <rect x="74" y="160" width="64" height="36" rx="6" fill="${C.water}"/>
      <rect x="40" y="96" width="20" height="58" rx="10" transform="rotate(-38 50 125)" fill="${C.skin}"/>
      <rect x="64" y="40" width="20" height="72" rx="10" fill="${C.skin}"/>
      <rect x="86" y="28" width="20" height="84" rx="10" fill="${C.skin}"/>
      <rect x="108" y="34" width="20" height="78" rx="10" fill="${C.skin}"/>
      <rect x="130" y="52" width="18" height="62" rx="9" fill="${C.skin}"/>
      <path d="M62 98 L150 98 L150 130 Q150 168 106 168 Q62 168 62 130 Z" fill="${C.skin}" stroke="none"/>
      <path d="M62 98 L62 130 Q62 168 106 168 Q150 168 150 130 L150 98"/>
      <path d="M40 38 Q30 54 38 70 M166 36 Q176 52 170 68" stroke="${C.yellowD}" stroke-width="5"/>`,

    rest: () => `
      <rect x="20" y="68" width="18" height="110" rx="6" fill="${C.brown}"/>
      <rect x="162" y="110" width="16" height="68" rx="6" fill="${C.brown}"/>
      <rect x="32" y="138" width="134" height="18" rx="4" fill="${C.brown}"/>
      <rect x="36" y="112" width="128" height="28" rx="8" fill="#FFFFFF"/>
      <ellipse cx="64" cy="106" rx="24" ry="12" fill="#FFFFFF"/>
      <circle cx="68" cy="92" r="16" fill="${C.skin}"/>
      <path d="M53 88 Q56 74 70 76 Q82 78 84 88 Q72 82 53 88 Z" fill="${C.brownD}" stroke-width="4"/>
      <path d="M61 95 Q65 99 69 95" stroke-width="3.5"/>
      <path d="M86 100 L158 100 Q162 100 162 106 L162 140 L86 140 Q78 140 78 132 L78 108 Q78 100 86 100 Z" fill="${C.purple}"/>
      <text x="112" y="74" font-size="30" font-weight="700" fill="${C.purple}" stroke="none" font-family="Segoe UI, Arial, sans-serif">z</text>
      <text x="134" y="50" font-size="40" font-weight="700" fill="${C.purple}" stroke="none" font-family="Segoe UI, Arial, sans-serif">Z</text>`,

    outside: () => `
      <path d="M52 14 L52 6 M52 90 L52 98 M14 52 L6 52 M90 52 L98 52 M25 25 L19 19 M79 25 L85 19 M25 79 L19 85 M79 79 L85 85" stroke="${C.yellowD}" stroke-width="6"/>
      <circle cx="52" cy="52" r="24" fill="${C.yellow}"/>
      <rect x="114" y="98" width="20" height="74" rx="4" fill="${C.brown}"/>
      <circle cx="124" cy="78" r="44" fill="${C.green}"/>
      <path d="M8 172 Q100 150 192 172 L192 192 L8 192 Z" fill="${C.greenL}"/>`,

    hug: () => `
      <path d="M100 172 C40 132 18 96 34 64 C50 34 90 36 100 66 C110 36 150 34 166 64 C182 96 160 132 100 172 Z" fill="${C.pink}"/>
      <path d="M58 70 Q62 58 74 56" stroke="#FFFFFF" stroke-width="7" opacity=".8"/>`,

    /* ---------- Rutiny ---------- */
    tap: () => `
      <rect x="16" y="40" width="22" height="44" rx="6" fill="${C.gray}"/>
      <rect x="64" y="20" width="48" height="13" rx="6" fill="${C.gray}"/>
      <rect x="82" y="31" width="12" height="21" fill="${C.gray}"/>
      <path d="M36 50 L130 50 Q152 50 152 72 L152 94 L126 94 L126 78 Q126 74 122 74 L36 74 Z" fill="${C.gray}"/>
      <rect x="131" y="94" width="16" height="66" fill="${C.water}" stroke="none"/>
      <path d="M60 150 L196 150 Q190 192 128 192 Q66 192 60 150 Z" fill="#FFFFFF"/>
      <ellipse cx="139" cy="160" rx="24" ry="5" fill="${C.water}" stroke="none"/>
      <path d="M112 112 Q108 122 112 126 Q116 122 112 112 Z M164 120 Q160 130 164 134 Q168 130 164 120 Z" fill="${C.water}" stroke="${C.waterD}" stroke-width="3"/>`,

    soap: () => `
      <rect x="96" y="28" width="10" height="20" fill="#FFFFFF"/>
      <rect x="118" y="44" width="32" height="10" rx="4" fill="#FFFFFF"/>
      <rect x="80" y="42" width="44" height="15" rx="5" fill="#FFFFFF"/>
      <rect x="88" y="56" width="26" height="26" fill="#FFFFFF"/>
      <rect x="58" y="80" width="86" height="100" rx="20" fill="${C.purple}"/>
      <rect x="74" y="108" width="54" height="42" rx="8" fill="#FFFFFF" stroke-width="4"/>
      <circle cx="101" cy="129" r="10" fill="${C.water}" stroke-width="4"/>
      ${bubble(168, 36, 11)}${bubble(180, 70, 8)}${bubble(162, 94, 5)}`,

    wash: () => `
      <g transform="translate(78 118) rotate(-12)">${hand(1)}</g>
      <g transform="translate(122 118) scale(-1 1) rotate(-12)">${hand(1)}</g>
      ${bubble(100, 34, 10)}${bubble(36, 104, 9)}${bubble(166, 112, 12)}${bubble(150, 176, 8)}${bubble(50, 170, 10)}
      ${bubble(98, 104, 9)}${bubble(112, 132, 7)}${bubble(28, 60, 6)}${bubble(176, 64, 7)}`,

    towel: () => `
      <path d="M22 40 L178 40" stroke-width="8"/>
      <rect x="14" y="30" width="12" height="22" rx="4" fill="${C.gray}"/>
      <rect x="174" y="30" width="12" height="22" rx="4" fill="${C.gray}"/>
      <path d="M52 40 L148 40 L148 176 Q148 182 142 182 L58 182 Q52 182 52 176 Z" fill="${C.green}"/>
      <rect x="52" y="40" width="96" height="24" fill="${C.greenD}"/>
      <path d="M56 146 L144 146 M56 160 L144 160" stroke="#FFFFFF" stroke-width="6"/>`,

    paper: () => `
      <rect x="92" y="128" width="54" height="54" fill="#FFFFFF"/>
      <path d="M96 158 L142 158" stroke="${C.gray}" stroke-width="4" stroke-dasharray="6 7"/>
      <path d="M56 58 L146 58 A18 42 0 0 1 146 142 L56 142 Z" fill="#FFFFFF"/>
      <ellipse cx="56" cy="100" rx="18" ry="42" fill="${C.grayL}"/>
      <ellipse cx="56" cy="100" rx="7" ry="16" fill="${C.brownL}"/>`,

    flush: () => `
      <rect x="44" y="30" width="112" height="140" rx="18" fill="#FFFFFF"/>
      <rect x="58" y="50" width="40" height="100" rx="10" fill="${C.grayL}"/>
      <rect x="102" y="50" width="40" height="100" rx="10" fill="${C.grayL}"/>
      <path d="M78 88 Q88 102 88 108 A10 10 0 0 1 68 108 Q68 102 78 88 Z" fill="${C.water}" stroke-width="4"/>
      <path d="M122 80 Q136 98 136 106 A14 14 0 0 1 108 106 Q108 98 122 80 Z" fill="${C.water}" stroke-width="4"/>`,

    tshirt: () => `
      <path d="M70 34 L40 50 L18 86 L44 100 L56 82 L56 172 L144 172 L144 82 L156 100 L182 86 L160 50 L130 34 Q100 56 70 34 Z" fill="${C.water}"/>
      <path d="M70 34 Q100 56 130 34" stroke-width="6"/>`,

    pants: () => `
      <path d="M58 30 L142 30 L152 176 L110 176 L100 84 L90 176 L48 176 Z" fill="${C.blue}"/>
      <rect x="58" y="30" width="84" height="16" fill="#6C8FAD"/>
      <path d="M100 46 L100 82 M70 46 Q72 62 86 64 M130 46 Q128 62 114 64" stroke-width="4"/>`,

    socks: () => `
      <path d="M72 22 L124 22 L124 104 Q124 120 140 130 L166 146 Q186 160 174 176 Q164 188 142 180 L88 158 Q72 150 72 130 Z" fill="${C.pink}"/>
      <rect x="72" y="22" width="52" height="26" fill="${C.coral}"/>
      <path d="M76 60 L120 60" stroke="${C.coral}" stroke-width="6"/>`,

    shoes: () => `
      <path d="M28 150 L28 104 Q28 92 40 92 L78 92 Q86 112 118 118 Q166 124 176 146 L176 150 Z" fill="${C.red}"/>
      <rect x="22" y="148" width="160" height="22" rx="10" fill="#FFFFFF"/>
      <path d="M72 104 L86 98 M78 116 L94 108 M90 124 L106 117" stroke-width="5"/>`,

    toothpaste: () => `
      <g transform="rotate(-25 100 100)">
        <rect x="30" y="70" width="16" height="60" rx="3" fill="${C.gray}"/>
        <path d="M44 74 L134 82 Q142 83 142 92 L142 108 Q142 117 134 118 L44 126 Z" fill="#FFFFFF"/>
        <rect x="62" y="88" width="52" height="24" rx="6" fill="${C.water}" stroke-width="4"/>
        <rect x="140" y="91" width="14" height="18" rx="3" fill="#FFFFFF"/>
        <path d="M154 94 Q174 84 180 96 Q184 110 164 108 Q158 108 154 106 Z" fill="${C.sky}" stroke-width="5"/>
      </g>`,

    toothbrush: () => `
      <g transform="rotate(-30 100 100)">
        <rect x="14" y="104" width="122" height="16" rx="8" fill="${C.green}"/>
        <path d="M130 104 L182 100 Q188 100 188 106 L188 116 Q188 122 182 122 L130 120 Z" fill="${C.green}"/>
        <rect x="138" y="74" width="44" height="28" rx="4" fill="#FFFFFF"/>
        <path d="M147 79 L147 98 M156 79 L156 98 M165 79 L165 98 M174 79 L174 98" stroke="${C.gray}" stroke-width="3"/>
        <path d="M136 74 Q144 58 158 66 Q170 54 184 68 Q188 76 180 76 L140 76 Q134 76 136 74 Z" fill="${C.sky}" stroke-width="4"/>
      </g>`,

    /* ---------- Čakanie ---------- */
    hourglass: () => `
      <path d="M62 38 L138 38 Q138 86 106 100 Q138 114 138 162 L62 162 Q62 114 94 100 Q62 86 62 38 Z" fill="${C.glass}"/>
      <path d="M74 60 L126 60 Q120 86 100 96 Q80 86 74 60 Z" fill="${C.yellow}" stroke="none"/>
      <path d="M70 158 Q100 124 130 158 Z" fill="${C.yellow}" stroke="none"/>
      <path d="M100 98 L100 140" stroke="${C.yellowD}" stroke-width="3"/>
      <path d="M62 38 L138 38 Q138 86 106 100 Q138 114 138 162 L62 162 Q62 114 94 100 Q62 86 62 38 Z"/>
      <rect x="48" y="24" width="104" height="16" rx="6" fill="${C.brown}"/>
      <rect x="48" y="160" width="104" height="16" rx="6" fill="${C.brown}"/>`,

    jarIcon: () => `
      <rect x="50" y="56" width="100" height="124" rx="20" fill="${C.glass}" stroke="none"/>
      <path d="M50 108 Q75 100 100 108 T150 108 L150 160 Q150 180 130 180 L70 180 Q50 180 50 160 Z" fill="${C.water}" stroke="none"/>
      <rect x="50" y="56" width="100" height="124" rx="20"/>
      <rect x="62" y="34" width="76" height="22" rx="6" fill="${C.brown}"/>`,

    circleIcon: () => `
      <circle cx="100" cy="100" r="78" fill="#FFFFFF"/>
      <path d="M100 100 L100 26 A74 74 0 1 1 39.9 143.1 Z" fill="${C.blue}" stroke="none"/>
      <circle cx="100" cy="100" r="78"/>
      <circle cx="100" cy="100" r="9" fill="${C.ink}" stroke="none"/>`,

    revealIcon: () => `
      <rect x="28" y="40" width="144" height="120" rx="12" fill="${C.sky}"/>
      <circle cx="136" cy="72" r="14" fill="${C.yellow}" stroke="none"/>
      <path d="M30 140 Q80 104 170 136 L170 158 L30 158 Z" fill="${C.green}" stroke="none"/>
      <rect x="28" y="40" width="48" height="40" fill="${C.gray}" stroke="none"/>
      <rect x="76" y="80" width="48" height="40" fill="${C.gray}" stroke="none"/>
      <rect x="28" y="120" width="48" height="40" fill="${C.gray}" stroke="none"/>
      <rect x="124" y="120" width="48" height="40" fill="${C.gray}" stroke="none"/>
      <rect x="28" y="40" width="144" height="120" rx="12"/>`,

    scene: () => `
      <rect x="0" y="0" width="200" height="200" fill="${C.sky}" stroke="none"/>
      <circle cx="150" cy="52" r="22" fill="${C.yellow}" stroke="none"/>
      <ellipse cx="58" cy="48" rx="26" ry="11" fill="#FFFFFF" stroke="none"/>
      <ellipse cx="72" cy="40" rx="16" ry="12" fill="#FFFFFF" stroke="none"/>
      <path d="M0 130 Q60 88 120 124 Q160 100 200 118 L200 200 L0 200 Z" fill="${C.greenL}" stroke="none"/>
      <path d="M0 162 Q80 128 200 158 L200 200 L0 200 Z" fill="${C.green}" stroke="none"/>
      <rect x="46" y="98" width="10" height="36" fill="${C.brownD}" stroke="none"/>
      <circle cx="51" cy="92" r="20" fill="${C.greenD}" stroke="none"/>`,

    chair: () => `
      <rect x="58" y="120" width="12" height="60" rx="4" fill="${C.brownD}"/>
      <rect x="130" y="120" width="12" height="60" rx="4" fill="${C.brownD}"/>
      <rect x="58" y="22" width="84" height="82" rx="12" fill="${C.brown}"/>
      <rect x="72" y="36" width="56" height="52" rx="8" fill="${C.brownL}" stroke-width="4"/>
      <rect x="44" y="100" width="112" height="24" rx="8" fill="${C.brown}"/>`,

    breathe: () => `
      <circle cx="84" cy="104" r="56" fill="${C.skin}"/>
      <path d="M30 98 Q28 50 84 48 Q140 50 138 98 Q128 70 84 68 Q40 70 30 98 Z" fill="${C.brownD}" stroke-width="4"/>
      <path d="M58 98 Q66 105 74 98 M94 98 Q102 105 110 98" stroke-width="5"/>
      <ellipse cx="62" cy="116" rx="8" ry="5" fill="${C.pink}" stroke="none"/>
      <ellipse cx="106" cy="116" rx="8" ry="5" fill="${C.pink}" stroke="none"/>
      <ellipse cx="84" cy="128" rx="7" ry="8" fill="${C.mouth}" stroke-width="4"/>
      <path d="M148 104 Q160 98 172 104 Q184 110 194 104 M148 124 Q162 118 178 126 M150 86 Q162 80 174 86" stroke="${C.waterD}" stroke-width="5"/>`,

    book: () => `
      <path d="M100 66 Q70 52 22 60 L22 166 Q70 158 100 172 Q130 158 178 166 L178 60 Q130 52 100 66 Z" fill="${C.blue}"/>
      <path d="M100 58 Q70 42 30 50 L30 154 Q70 146 100 160 Z" fill="#FFFFFF"/>
      <path d="M100 58 Q130 42 170 50 L170 154 Q130 146 100 160 Z" fill="#FFFFFF"/>
      <path d="M44 74 Q66 68 88 76 M44 94 Q66 88 88 96 M44 114 Q66 108 88 116 M112 76 Q134 68 156 74 M112 96 Q134 88 156 94 M112 116 Q134 108 156 114" stroke="${C.gray}" stroke-width="4"/>`,

    /* ---------- Senzorický trenažér ---------- */
    vacuum: () => `
      <path d="M122 50 L168 158" stroke="${C.ink}" stroke-width="14"/>
      <path d="M122 50 L168 158" stroke="#B9BEC5" stroke-width="5"/>
      <path d="M98 126 C142 122 152 70 124 50" stroke="${C.ink}" stroke-width="18"/>
      <path d="M98 126 C142 122 152 70 124 50" stroke="${C.gray}" stroke-width="8"/>
      <ellipse cx="62" cy="138" rx="50" ry="36" fill="${C.red}"/>
      <path d="M26 128 Q60 96 96 124" fill="${C.coral}" stroke-width="5"/>
      <circle cx="100" cy="128" r="10" fill="${C.gray}"/>
      <circle cx="52" cy="122" r="7" fill="#FFFFFF" stroke-width="4"/>
      <circle cx="42" cy="170" r="13" fill="${C.ink}" stroke="none"/>
      <circle cx="42" cy="170" r="5" fill="${C.gray}" stroke="none"/>
      <rect x="140" y="156" width="54" height="20" rx="8" fill="${C.blue}"/>
      <rect x="106" y="36" width="34" height="18" rx="9" fill="${C.ink}" stroke="none" transform="rotate(-20 123 45)"/>`,

    dryer: () => `
      <rect x="36" y="22" width="128" height="94" rx="20" fill="#FFFFFF"/>
      <circle cx="100" cy="66" r="11" fill="${C.grayL}" stroke-width="4"/>
      <rect x="68" y="112" width="64" height="16" rx="6" fill="${C.gray}"/>
      <path d="M82 140 q-8 10 0 20 q8 10 0 20 M100 140 q-8 10 0 20 q8 10 0 20 M118 140 q-8 10 0 20 q8 10 0 20" stroke="${C.waterD}" stroke-width="5"/>`,

    baby: () => `
      <ellipse cx="38" cy="108" rx="12" ry="15" fill="${C.skin}"/>
      <ellipse cx="162" cy="108" rx="12" ry="15" fill="${C.skin}"/>
      <circle cx="100" cy="106" r="62" fill="${C.skin}"/>
      <path d="M94 46 Q98 30 112 36" stroke-width="5"/>
      <path d="M66 88 L84 96 L66 104 M134 88 L116 96 L134 104" stroke-width="5"/>
      <circle cx="62" cy="124" r="8" fill="${C.pink}" stroke="none"/>
      <circle cx="138" cy="124" r="8" fill="${C.pink}" stroke="none"/>
      <ellipse cx="100" cy="138" rx="18" ry="15" fill="${C.mouth}"/>
      <path d="M70 110 Q64 122 70 128 Q76 122 70 110 Z M130 110 Q124 122 130 128 Q136 122 130 110 Z" fill="${C.water}" stroke="${C.waterD}" stroke-width="3"/>`,

    bell: () => `
      <path d="M26 70 Q16 96 26 122 M174 70 Q184 96 174 122" stroke="${C.yellowD}" stroke-width="6"/>
      <circle cx="100" cy="152" r="13" fill="${C.brown}"/>
      <path d="M100 32 C68 32 58 58 58 86 L58 120 L42 146 L158 146 L142 120 L142 86 C142 58 132 32 100 32 Z" fill="${C.yellow}"/>
      <circle cx="100" cy="26" r="9" fill="${C.yellow}"/>
      <path d="M78 64 Q82 52 94 48" stroke="#FFFFFF" stroke-width="7" opacity=".8"/>`,

    speaker: () => `
      <path d="M36 80 L64 80 L102 48 L102 152 L64 120 L36 120 Z" fill="${C.purple}"/>
      <path d="M124 78 Q138 100 124 122 M144 62 Q168 100 144 138 M164 46 Q198 100 164 154" stroke="${C.blue}" stroke-width="7"/>`,

    /* ---------- Zvieratá (aktivita Ukáž) ---------- */
    dog: () => `
      <ellipse cx="100" cy="98" rx="50" ry="54" fill="${C.brown}"/>
      <path d="M58 58 Q28 64 32 116 Q38 138 58 130 Q66 100 74 70 Z" fill="${C.brownD}"/>
      <path d="M142 58 Q172 64 168 116 Q162 138 142 130 Q134 100 126 70 Z" fill="${C.brownD}"/>
      <ellipse cx="100" cy="126" rx="30" ry="24" fill="${C.brownL}"/>
      <path d="M94 146 Q100 162 106 146 Z" fill="${C.pink}" stroke-width="4"/>
      <ellipse cx="100" cy="113" rx="11" ry="8" fill="${C.ink}" stroke="none"/>
      <path d="M100 120 L100 132 M88 136 Q100 144 112 136" stroke-width="4"/>
      <circle cx="82" cy="90" r="6.5" fill="${C.ink}" stroke="none"/>
      <circle cx="118" cy="90" r="6.5" fill="${C.ink}" stroke="none"/>`,

    cat: () => `
      <path d="M52 84 L58 28 L98 60 Z" fill="#E3A96B"/>
      <path d="M148 84 L142 28 L102 60 Z" fill="#E3A96B"/>
      <path d="M64 68 L67 44 L86 58 Z" fill="${C.pink}" stroke="none"/>
      <path d="M136 68 L133 44 L114 58 Z" fill="${C.pink}" stroke="none"/>
      <ellipse cx="100" cy="110" rx="58" ry="52" fill="#E3A96B"/>
      <path d="M86 62 L90 78 M100 60 L100 78 M114 62 L110 78" stroke="#C8864A" stroke-width="5"/>
      <ellipse cx="80" cy="102" rx="7" ry="10" fill="${C.ink}" stroke="none"/>
      <ellipse cx="120" cy="102" rx="7" ry="10" fill="${C.ink}" stroke="none"/>
      <path d="M93 120 L107 120 L100 128 Z" fill="${C.pink}" stroke-width="4"/>
      <path d="M100 128 Q100 138 89 140 M100 128 Q100 138 111 140" stroke-width="4"/>
      <path d="M36 116 L70 122 M38 134 L70 130 M164 116 L130 122 M162 134 L130 130" stroke-width="3.5"/>`,

    cow: () => `
      <path d="M62 52 Q44 42 48 22 Q62 34 76 44 Z" fill="${C.brownL}"/>
      <path d="M138 52 Q156 42 152 22 Q138 34 124 44 Z" fill="${C.brownL}"/>
      <ellipse cx="42" cy="78" rx="22" ry="12" transform="rotate(-20 42 78)" fill="#FFFFFF"/>
      <ellipse cx="158" cy="78" rx="22" ry="12" transform="rotate(20 158 78)" fill="#FFFFFF"/>
      <ellipse cx="100" cy="94" rx="46" ry="54" fill="#FFFFFF"/>
      <path d="M66 62 Q82 48 94 60 Q92 80 72 82 Q62 76 66 62 Z" fill="${C.ink}" stroke="none"/>
      <path d="M126 104 Q140 96 144 110 Q140 124 128 120 Z" fill="${C.ink}" stroke="none"/>
      <circle cx="82" cy="98" r="6.5" fill="${C.ink}" stroke="none"/>
      <circle cx="118" cy="98" r="6.5" fill="${C.ink}" stroke="none"/>
      <ellipse cx="100" cy="146" rx="40" ry="28" fill="${C.pink}"/>
      <ellipse cx="86" cy="146" rx="5" ry="7" fill="${C.ink}" stroke="none"/>
      <ellipse cx="114" cy="146" rx="5" ry="7" fill="${C.ink}" stroke="none"/>`,

    fish: () => `
      <path d="M150 100 L188 68 L182 100 L188 132 Z" fill="${C.blue}"/>
      <path d="M76 62 Q96 30 122 62 Z" fill="${C.blue}"/>
      <path d="M22 100 Q60 46 128 60 Q160 74 158 100 Q160 126 128 140 Q60 154 22 100 Z" fill="${C.water}"/>
      <path d="M80 76 Q92 100 80 124" stroke-width="5"/>
      <path d="M104 84 q9 8 0 16 M122 78 q9 11 0 22 M122 102 q9 11 0 22" stroke-width="4"/>
      <circle cx="54" cy="92" r="9" fill="#FFFFFF" stroke-width="4"/>
      <circle cx="54" cy="92" r="4" fill="${C.ink}" stroke="none"/>
      <path d="M30 106 Q38 112 46 108" stroke-width="4"/>
      ${bubble(28, 52, 7)}${bubble(40, 30, 5)}`,

    bird: () => `
      <path d="M96 158 L92 182 M120 158 L124 182 M82 182 L100 182 M114 182 L134 182" stroke-width="5"/>
      <path d="M150 112 L192 94 L186 126 Z" fill="${C.blue}"/>
      <ellipse cx="110" cy="118" rx="58" ry="44" fill="${C.yellow}"/>
      <circle cx="70" cy="76" r="36" fill="${C.yellow}"/>
      <path d="M102 110 Q132 94 158 116 Q134 146 102 128 Z" fill="${C.yellowD}"/>
      <path d="M36 68 L12 80 L38 90 Z" fill="${C.coral}"/>
      <circle cx="62" cy="68" r="6.5" fill="${C.ink}" stroke="none"/>
      <circle cx="76" cy="88" r="7" fill="${C.pink}" stroke="none"/>`,

    pointTile: () => `
      <rect x="8" y="110" width="56" height="72" rx="10" fill="#FFFFFF"/>
      <circle cx="36" cy="146" r="14" fill="${C.yellow}" stroke-width="4"/>
      <rect x="72" y="110" width="56" height="72" rx="10" fill="#FFFFFF" stroke="${C.greenD}" stroke-width="7"/>
      <path d="M100 162 C80 150 76 138 83 131 C90 124 98 127 100 135 C102 127 110 124 117 131 C124 138 120 150 100 162 Z" fill="${C.pink}" stroke-width="4"/>
      <rect x="136" y="110" width="56" height="72" rx="10" fill="#FFFFFF"/>
      <rect x="152" y="134" width="24" height="24" rx="4" fill="${C.blue}" stroke-width="4"/>
      <rect x="89" y="30" width="22" height="70" rx="11" fill="${C.skin}"/>
      <rect x="68" y="6" width="64" height="46" rx="17" fill="${C.skin}"/>
      <path d="M84 14 L84 34 M100 12 L100 34 M116 14 L116 34" stroke-width="4"/>
      <path d="M56 74 L70 82 M144 74 L130 82" stroke="${C.yellowD}" stroke-width="5"/>`,

    placeholder: () => `
      <rect x="22" y="22" width="156" height="156" rx="24" fill="#FAF8F3" stroke="${C.gray}" stroke-dasharray="14 12"/>
      <path d="M60 84 L80 84 L89 70 L111 70 L120 84 L140 84 L140 136 L60 136 Z" fill="#FFFFFF" stroke="${C.gray}"/>
      <circle cx="100" cy="109" r="15" stroke="${C.gray}"/>`,

    /* ---------- Osoby ---------- */
    mom: () => face({
      bg: '#F3E6EE', shirt: C.purple,
      hairBack: `<path d="M54 96 Q48 34 100 34 Q152 34 146 96 L154 160 Q128 152 118 128 L82 128 Q72 152 46 160 Z" fill="#8C5A3C"/>`,
      hair: `<path d="M60 86 Q60 42 100 44 Q140 42 140 86 Q130 62 106 58 Q84 72 60 86 Z" fill="#8C5A3C"/>`,
    }),
    dad: () => face({
      bg: '#E4EFE6', shirt: C.green,
      hair: `<path d="M60 84 Q56 40 100 40 Q144 40 140 84 Q136 62 120 58 Q100 64 80 58 Q64 62 60 84 Z" fill="#4A3B33"/>`,
    }),
    sibling: () => face({
      bg: '#F7EFD9', shirt: C.yellow,
      hair: `<path d="M60 86 Q58 44 100 42 Q142 44 140 86 Q130 58 100 60 Q70 58 60 86 Z" fill="${C.yellowD}"/><path d="M100 44 Q94 28 110 24" stroke-width="5"/>`,
    }),
    doctor: () => face({
      bg: '#E3EEF5', shirt: '#FFFFFF',
      shirtExtra: `<path d="M84 146 L100 176 L116 146 Z" fill="${C.water}"/><path d="M100 176 L86 204 M100 176 L114 204" stroke-width="5"/>
        <path d="M80 148 Q70 182 92 188 Q114 192 114 170" stroke-width="5"/><circle cx="114" cy="166" r="8" fill="${C.gray}"/>`,
      hair: `<path d="M60 84 Q58 42 100 42 Q142 42 140 84 Q134 60 100 58 Q66 60 60 84 Z" fill="#6B5B4E"/>`,
    }),
    police: () => face({
      bg: '#E2E8F0', shirt: '#5B7BA3',
      shirtExtra: `<path d="M94 146 L106 146 L110 176 L100 188 L90 176 Z" fill="${C.navy}"/>
        <path d="M136 162 l5 10 l11 1 l-8 7 l3 11 l-11 -6 l-11 6 l3 -11 l-8 -7 l11 -1 Z" fill="${C.yellow}" stroke-width="3"/>`,
      hair: `<path d="M60 90 Q60 70 66 66 L134 66 Q140 70 140 90 Q134 76 100 76 Q66 76 60 90 Z" fill="#4A3B33" stroke="none"/>
        <path d="M56 72 Q58 32 100 30 Q142 32 144 72 Z" fill="${C.navy}"/>
        <rect x="52" y="66" width="96" height="14" rx="7" fill="${C.ink}"/>
        <circle cx="100" cy="50" r="8" fill="${C.yellow}"/>`,
    }),
    person: () => face({
      bg: '#EEEAE2', shirt: C.gray,
      hair: `<path d="M60 84 Q58 44 100 42 Q142 44 140 84 Q128 60 100 60 Q72 60 60 84 Z" fill="#7A6A5C"/>`,
    }),
    grandma: () => face({
      bg: '#F2E8E4', shirt: C.red,
      hairBack: `<circle cx="100" cy="36" r="20" fill="${C.hair}"/>`,
      hair: `<path d="M58 92 Q54 46 100 46 Q146 46 142 92 Q136 64 100 62 Q64 64 58 92 Z" fill="${C.hair}"/>`,
      extra: `<circle cx="85" cy="93" r="13" stroke-width="4"/><circle cx="115" cy="93" r="13" stroke-width="4"/><path d="M98 92 Q100 89 102 92" stroke-width="4"/>`,
    }),
    grandpa: () => face({
      bg: '#E5EBF0', shirt: C.blue,
      hairBack: `<path d="M66 50 Q46 52 50 70 Q40 80 52 92 Q58 100 66 92 Z M134 50 Q154 52 150 70 Q160 80 148 92 Q142 100 134 92 Z" fill="${C.hair}"/>`,
      hair: `<path d="M82 56 Q92 50 104 52" stroke="#FFFFFF" stroke-width="6" opacity=".8"/>`,
      extra: `<path d="M80 110 Q88 100 100 106 Q112 100 120 110 Q110 116 100 111 Q90 116 80 110 Z" fill="${C.hair}" stroke-width="4"/>
        <path d="M76 70 Q84 62 94 66 M106 66 Q116 62 124 70" stroke="${C.hair}" stroke-width="6"/>`,
    }),

    lost: () => `
      <path d="M100 178 C70 138 48 112 48 80 A52 52 0 0 1 152 80 C152 112 130 138 100 178 Z" fill="${C.red}"/>
      <circle cx="100" cy="80" r="30" fill="#FFFFFF"/>
      <text x="100" y="95" text-anchor="middle" font-size="44" font-weight="800" fill="${C.ink}" stroke="none" font-family="Segoe UI, Arial, sans-serif">?</text>`,
    hurt: () => `
      <g transform="rotate(-35 100 100)">
        <rect x="24" y="74" width="152" height="52" rx="26" fill="#E8C39E"/>
        <rect x="76" y="74" width="48" height="52" fill="#F5DEC8"/>
        <circle cx="90" cy="90" r="3" fill="${C.brown}" stroke="none"/><circle cx="110" cy="90" r="3" fill="${C.brown}" stroke="none"/>
        <circle cx="90" cy="110" r="3" fill="${C.brown}" stroke="none"/><circle cx="110" cy="110" r="3" fill="${C.brown}" stroke="none"/>
        <circle cx="100" cy="100" r="3" fill="${C.brown}" stroke="none"/>
      </g>`,
    home: () => `
      <rect x="126" y="34" width="18" height="40" fill="${C.brown}"/>
      <rect x="46" y="90" width="108" height="86" fill="${C.yellow}"/>
      <path d="M28 96 L100 34 L172 96 Z" fill="${C.red}"/>
      <rect x="88" y="124" width="28" height="52" rx="3" fill="${C.brown}"/>
      <rect x="58" y="108" width="22" height="22" rx="3" fill="${C.sky}" stroke-width="4"/>
      <rect x="126" y="108" width="22" height="22" rx="3" fill="${C.sky}" stroke-width="4"/>`,

    /* ---------- Kartotéka: jedlo ---------- */
    bread: () => `<g transform="translate(0 -10)">
      <path d="M18 150 Q16 74 88 68 Q158 66 160 134 L160 150 Q160 156 154 156 L24 156 Q18 156 18 150 Z" fill="${C.brown}"/>
      <path d="M44 96 L58 118 M72 84 L86 108" stroke="${C.brownD}" stroke-width="5"/>
      <path d="M108 176 L108 120 Q94 116 96 102 Q98 88 116 88 L160 88 Q178 88 180 102 Q182 116 168 120 L168 176 Q168 182 162 182 L114 182 Q108 182 108 176 Z" fill="${C.brown}"/>
      <path d="M118 170 L118 113 Q106 111 106 102 Q107 97 118 97 L158 97 Q170 97 170 102 Q170 111 158 113 L158 170 Z" fill="${C.brownL}" stroke="none"/></g>`,

    yogurt: () => `
      <path d="M118 84 L148 22" stroke="${C.ink}" stroke-width="16"/>
      <path d="M118 84 L148 22" stroke="${C.gray}" stroke-width="6"/>
      <path d="M50 78 L150 78 L138 178 L62 178 Z" fill="#FFFFFF"/>
      <path d="M53.5 106 L146.5 106 L141.6 146 L58.4 146 Z" fill="${C.pink}" stroke="none"/>
      <path d="M50 78 L150 78 L138 178 L62 178 Z"/>
      <path d="M100 122 C94 114 84 118 86 128 C88 136 96 142 100 142 C104 142 112 136 114 128 C116 118 106 114 100 122 Z" fill="${C.red}" stroke-width="4"/>
      <path d="M92 116 L100 122 L108 116" stroke="${C.greenD}" stroke-width="4"/>
      <ellipse cx="100" cy="78" rx="54" ry="13" fill="#FFFFFF"/>
      <ellipse cx="100" cy="79" rx="42" ry="7" fill="${C.grayL}" stroke="none"/>
      <path d="M112 80 L124 58" stroke="${C.ink}" stroke-width="16"/>
      <path d="M112 80 L124 58" stroke="${C.gray}" stroke-width="6"/>`,

    /* Palacinky: zrolované, na konci vidno špirálu s džemom */
    pancakes: () => {
      const roll = (x, y) => `
      <rect x="${x}" y="${y}" width="122" height="36" rx="18" fill="${C.yellow}"/>
      <ellipse cx="${x + 112}" cy="${y + 18}" rx="11" ry="18" fill="${C.yellow}"/>
      <path d="M${x + 112} ${y + 18} a2.5 3.5 0 0 1 5 0 a5 8 0 0 1 -10 0 a7.5 12 0 0 1 14 -1" stroke="${C.red}" stroke-width="4"/>`;
      return `<g transform="translate(0 -14)">
      <ellipse cx="100" cy="140" rx="86" ry="34" fill="#FFFFFF"/>
      <ellipse cx="100" cy="138" rx="62" ry="20" stroke="${C.grayL}" stroke-width="4"/>
      ${roll(30, 82)}${roll(42, 114)}
      <path d="M52 94 L60 94 M84 104 L94 104 M118 96 L126 96 M64 126 L74 126 M98 138 L108 138 M128 128 L136 128" stroke="${C.yellowD}" stroke-width="5"/></g>`;
    },

    pasta: () => `
      <path d="M36 104 Q38 58 100 54 Q162 58 164 104 Z" fill="${C.yellow}"/>
      <path d="M50 96 Q58 76 74 90 Q86 102 94 84 M108 84 Q118 70 130 84 Q140 96 150 88 M66 72 Q80 62 90 70 M120 102 Q128 90 140 100" stroke="${C.yellowD}" stroke-width="5"/>
      <path d="M78 66 Q76 46 100 44 Q126 44 124 64 Q114 72 100 68 Q88 74 78 66 Z" fill="${C.red}"/>
      <path d="M100 46 Q110 34 122 40 Q114 52 100 46 Z" fill="${C.green}" stroke-width="4"/>
      <path d="M22 102 L178 102 Q172 172 100 174 Q28 172 22 102 Z" fill="${C.blue}"/>
      <path d="M36 118 Q100 128 164 118" stroke="#FFFFFF" stroke-width="5" opacity=".7"/>`,

    meat: () => `
      <circle cx="146" cy="170" r="13" fill="#FFFFFF"/>
      <circle cx="168" cy="148" r="13" fill="#FFFFFF"/>
      <path d="M110 112 L154 156" stroke="${C.ink}" stroke-width="28"/>
      <path d="M110 112 L156 158" stroke="#FFFFFF" stroke-width="16"/>
      <path d="M40 58 Q56 22 100 30 Q146 40 144 86 Q142 116 124 130 Q104 142 80 136 Q42 126 34 96 Q30 76 40 58 Z" fill="${C.brown}"/>
      <path d="M58 60 Q70 44 90 44" stroke="${C.brownL}" stroke-width="7"/>`,

    apple: () => `
      <path d="M100 58 C80 40 30 44 32 102 C34 148 66 182 100 170 C134 182 166 148 168 102 C170 44 120 40 100 58 Z" fill="${C.red}"/>
      <path d="M100 58 Q96 40 106 24" stroke="${C.brownD}" stroke-width="7"/>
      <path d="M106 38 Q128 16 152 30 Q130 54 106 38 Z" fill="${C.green}"/>
      <path d="M58 86 Q62 70 76 66" stroke="#FFFFFF" stroke-width="8" opacity=".75"/>`,

    /* ---------- Kartotéka: aktivity a hračky ---------- */
    drawing: () => `
      <rect x="24" y="30" width="132" height="120" rx="6" fill="#FFFFFF" transform="rotate(-6 90 90)"/>
      <circle cx="62" cy="70" r="14" stroke="${C.yellowD}" stroke-width="6" fill="${C.yellow}"/>
      <path d="M62 44 L62 38 M36 70 L30 70 M88 70 L94 70 M44 52 L40 48 M80 52 L84 48" stroke="${C.yellowD}" stroke-width="5"/>
      <path d="M98 114 L98 88 L118 72 L138 88 L138 114 Z" stroke="${C.red}" stroke-width="6" transform="rotate(-6 90 90)"/>
      <path d="M34 128 Q60 112 90 124 Q120 136 146 114" stroke="${C.green}" stroke-width="7"/>
      <g transform="rotate(-40 140 150)">
        <rect x="96" y="138" width="78" height="24" rx="4" fill="${C.blue}"/>
        <rect x="116" y="138" width="36" height="24" fill="${C.sky}" stroke-width="4"/>
        <path d="M174 140 L194 150 L174 160 Z" fill="${C.blue}"/>
      </g>`,

    bath: () => `
      <path d="M22 104 L178 104 L170 142 Q164 166 138 166 L62 166 Q36 166 30 142 Z" fill="#FFFFFF"/>
      <rect x="54" y="160" width="14" height="20" rx="5" fill="${C.gray}"/>
      <rect x="132" y="160" width="14" height="20" rx="5" fill="${C.gray}"/>
      ${bubble(46, 96, 14)}${bubble(70, 88, 16)}${bubble(152, 92, 14)}${bubble(172, 98, 9)}${bubble(30, 102, 9)}${bubble(96, 60, 9)}${bubble(80, 36, 6)}
      <path d="M112 100 Q108 76 124 72 Q118 60 126 50 Q140 42 150 54 Q156 64 148 72 Q164 80 158 98 Z" fill="${C.yellow}"/>
      <path d="M150 58 L166 62 L150 68 Z" fill="${C.coral}" stroke-width="4"/>
      <circle cx="138" cy="58" r="4" fill="${C.ink}" stroke="none"/>
      <rect x="14" y="98" width="172" height="16" rx="8" fill="#FFFFFF"/>`,

    music: () => `
      <path d="M50 58 L96 104 M122 58 L76 104" stroke="${C.ink}" stroke-width="14"/>
      <path d="M50 58 L96 104 M122 58 L76 104" stroke="${C.brownL}" stroke-width="5"/>
      <circle cx="50" cy="58" r="9" fill="${C.brownL}"/><circle cx="122" cy="58" r="9" fill="${C.brownL}"/>
      <path d="M28 116 L28 160 Q28 180 86 180 Q144 180 144 160 L144 116" fill="${C.red}"/>
      <path d="M32 122 L50 170 L68 126 L86 174 L104 126 L122 170 L140 122" stroke="#FFFFFF" stroke-width="5"/>
      <ellipse cx="86" cy="116" rx="58" ry="17" fill="${C.grayL}"/>
      <path d="M148 34 L182 26 L182 38 L148 46 Z" fill="${C.navy}" stroke-width="5"/>
      <path d="M148 40 L148 92 M182 32 L182 84" stroke-width="6"/>
      <ellipse cx="138" cy="94" rx="13" ry="10" transform="rotate(-20 138 94)" fill="${C.navy}"/>
      <ellipse cx="172" cy="86" rx="13" ry="10" transform="rotate(-20 172 86)" fill="${C.navy}"/>`,

    ball: () => `
      <circle cx="100" cy="104" r="72" fill="${C.yellow}"/>
      <path d="M100 32 Q52 104 100 176 A72 72 0 0 1 100 32 Z" fill="${C.red}" stroke="none"/>
      <path d="M100 32 Q148 104 100 176 A72 72 0 0 0 100 32 Z" fill="${C.blue}" stroke="none"/>
      <path d="M100 32 Q52 104 100 176 M100 32 Q148 104 100 176" stroke-width="5"/>
      <circle cx="100" cy="104" r="72"/>
      <path d="M50 76 Q58 60 72 52" stroke="#FFFFFF" stroke-width="8" opacity=".7"/>`,

    car: () => `
      <path d="M22 138 L22 114 Q22 102 34 100 L60 96 L78 64 Q82 58 90 58 L128 58 Q136 58 140 64 L160 96 Q178 98 178 114 L178 138 Q178 144 172 144 L28 144 Q22 144 22 138 Z" fill="${C.red}"/>
      <path d="M86 68 L96 68 L96 94 L70 94 Z" fill="${C.sky}" stroke-width="4"/>
      <path d="M104 68 L126 68 Q131 68 133 72 L146 94 L104 94 Z" fill="${C.sky}" stroke-width="4"/>
      <path d="M100 100 L100 132 M108 110 L116 110" stroke-width="4"/>
      <rect x="164" y="108" width="12" height="10" rx="4" fill="${C.yellow}" stroke-width="4"/>
      <circle cx="60" cy="144" r="21" fill="${C.ink}" stroke="none"/><circle cx="60" cy="144" r="8" fill="${C.gray}" stroke="none"/>
      <circle cx="140" cy="144" r="21" fill="${C.ink}" stroke="none"/><circle cx="140" cy="144" r="8" fill="${C.gray}" stroke="none"/>`,

    blocks: () => `
      ${cube(24, 114, 64, 16, C.blue, C.sky, '#6C8FAD')}
      ${cube(90, 114, 64, 16, C.green, C.greenL, C.greenD)}
      ${cube(58, 46, 64, 16, C.red, C.coral, '#C27966')}
      <circle cx="56" cy="146" r="15" fill="${C.sky}" stroke="none"/>
      <path d="M106 162 L122 130 L138 162 Z" fill="${C.greenL}" stroke="none"/>
      <path d="M90 94 C78 84 72 74 78 68 C83 63 89 65 90 71 C91 65 97 63 102 68 C108 74 102 84 90 94 Z" fill="${C.coral}" stroke="none"/>`,

    /* ---------- Kartotéka: miesta ---------- */
    playground: () => `
      <path d="M8 176 Q100 164 192 176 L192 190 L8 190 Z" fill="${C.greenL}"/>
      <path d="M40 176 L40 50 M76 176 L76 50" stroke-width="7"/>
      <path d="M40 76 L76 76 M40 102 L76 102 M40 128 L76 128 M40 154 L76 154" stroke-width="6"/>
      <path d="M76 56 C116 60 124 150 176 166" stroke="${C.ink}" stroke-width="28"/>
      <path d="M76 56 C116 60 124 150 176 166" stroke="${C.yellow}" stroke-width="16"/>
      <rect x="32" y="42" width="52" height="14" rx="5" fill="${C.brown}"/>
      <path d="M36 42 Q36 22 58 22 Q80 22 80 42" stroke="${C.blue}" stroke-width="8"/>`,

    shop: () => {
      let aw = '';
      for (let i = 0; i < 6; i++) {
        const x = 24 + i * 25.33;
        aw += `<path d="M${x} 48 L${x + 25.33} 48 L${x + 25.33} 76 A12.67 12.67 0 0 1 ${x} 76 Z" fill="${i % 2 ? '#FFFFFF' : C.red}"/>`;
      }
      return `
      <rect x="36" y="70" width="128" height="108" fill="${C.grayL}"/>
      <rect x="48" y="102" width="60" height="50" rx="4" fill="${C.sky}"/>
      <path d="M48 134 L108 134" stroke-width="5"/>
      <circle cx="62" cy="124" r="8" fill="${C.red}" stroke-width="4"/><circle cx="80" cy="124" r="8" fill="${C.yellow}" stroke-width="4"/><circle cx="96" cy="124" r="7" fill="${C.green}" stroke-width="4"/>
      <rect x="120" y="102" width="32" height="76" rx="3" fill="${C.brown}"/>
      <circle cx="144" cy="142" r="3.5" fill="${C.ink}" stroke="none"/>
      <rect x="28" y="30" width="144" height="20" rx="6" fill="${C.blue}"/>
      ${aw}
      <path d="M20 178 L180 178" stroke-width="7"/>`;
    },

    school: () => `
      <path d="M100 32 L100 8" stroke-width="5"/>
      <path d="M100 8 L124 15 L100 22 Z" fill="${C.red}" stroke-width="4"/>
      <rect x="30" y="94" width="140" height="84" fill="${C.pink}"/>
      <path d="M18 98 L50 64 L150 64 L182 98 Z" fill="${C.green}"/>
      <path d="M62 98 L100 30 L138 98 Z" fill="${C.green}"/>
      <circle cx="100" cy="74" r="12" fill="${C.yellow}" stroke-width="5"/>
      <rect x="84" y="126" width="32" height="52" rx="14" fill="${C.brown}"/>
      <rect x="42" y="112" width="28" height="26" rx="4" fill="${C.sky}" stroke-width="5"/>
      <rect x="130" y="112" width="28" height="26" rx="4" fill="${C.sky}" stroke-width="5"/>
      <path d="M42 152 L70 152 M130 152 L158 152" stroke="${C.coral}" stroke-width="6"/>`,

    /* ---------- Dlaždice modulov ---------- */
    pecsTile: () => `
      <path d="M26 38 Q26 22 42 22 L158 22 Q174 22 174 38 L174 124 Q174 140 158 140 L90 140 L52 174 L60 140 L42 140 Q26 140 26 124 Z" fill="#FFFFFF"/>
      <path d="M74 44 L126 44 L120 122 L80 122 Z" fill="${C.glass}" stroke="none"/>
      <path d="M76 70 L124 70 L120 122 L80 122 Z" fill="${C.water}" stroke="none"/>
      <path d="M74 44 L126 44 L120 122 L80 122 Z" stroke-width="5"/>`,
    stepsTile: () => `
      <rect x="30" y="28" width="42" height="42" rx="9" fill="${C.green}"/>
      <path d="M40 49 L48 57 L62 40" stroke="#FFFFFF" stroke-width="6"/>
      <rect x="86" y="41" width="86" height="16" rx="8" fill="${C.grayL}" stroke="none"/>
      <rect x="30" y="80" width="42" height="42" rx="9" fill="${C.green}"/>
      <path d="M40 101 L48 109 L62 92" stroke="#FFFFFF" stroke-width="6"/>
      <rect x="86" y="93" width="86" height="16" rx="8" fill="${C.grayL}" stroke="none"/>
      <rect x="30" y="132" width="42" height="42" rx="9" fill="#FFFFFF"/>
      <rect x="86" y="145" width="86" height="16" rx="8" fill="${C.grayL}" stroke="none"/>`,
    /* Kartotéka: kartičky s obrázkami a farebnými záložkami v krabičke */
    cardsTile: () => {
      const side = (rot, cx, tabX, tab, pic) => `<g transform="rotate(${rot} ${cx} 182)">
        <rect x="${tabX}" y="52" width="22" height="20" rx="6" fill="${tab}" stroke-width="5"/>
        <rect x="${cx - 28}" y="64" width="56" height="112" rx="8" fill="#FFFFFF" stroke-width="5"/>${pic}</g>`;
      return `
      ${side(-11, 60, 36, C.red, `<path d="M60 90 C53 82 40 85 41 100 C42 112 52 118 60 115 C68 118 78 112 79 100 C80 85 67 82 60 90 Z" fill="${C.red}" stroke-width="4"/><path d="M60 90 Q59 83 63 78" stroke="${C.brownD}" stroke-width="4"/>`)}
      ${side(11, 140, 142, C.yellow, `<path d="M120 100 L140 82 L160 100 Z" fill="${C.red}" stroke-width="4"/><rect x="125" y="100" width="30" height="20" fill="${C.yellow}" stroke-width="4"/>`)}
      <rect x="88" y="30" width="24" height="20" rx="6" fill="${C.green}" stroke-width="5"/>
      <rect x="70" y="42" width="60" height="134" rx="8" fill="#FFFFFF" stroke-width="5"/>
      <circle cx="100" cy="84" r="21" fill="${C.blue}" stroke="none"/>
      <path d="M100 63 Q86 84 100 105 A21 21 0 0 1 100 63 Z" fill="${C.yellow}" stroke="none"/>
      <path d="M100 63 Q86 84 100 105" stroke-width="4"/><circle cx="100" cy="84" r="21" stroke-width="5"/>
      <rect x="22" y="132" width="156" height="52" rx="10" fill="${C.blue}"/>
      <rect x="78" y="150" width="44" height="12" rx="6" fill="${C.navy}" stroke="none"/>`;
    },
    family: () => `
      <path d="M18 196 Q20 132 70 128 Q120 132 122 196" fill="${C.purple}"/>
      <circle cx="70" cy="86" r="30" fill="${C.skin}"/>
      <path d="M40 92 Q36 52 70 52 Q104 52 100 92 Q96 70 70 68 Q44 70 40 92 Z" fill="#8C5A3C" stroke-width="5"/>
      <path d="M78 196 Q80 132 130 128 Q180 132 182 196" fill="${C.green}"/>
      <circle cx="130" cy="86" r="30" fill="${C.skin}"/>
      <path d="M101 84 Q100 54 130 54 Q160 54 159 84 Q150 68 130 68 Q110 68 101 84 Z" fill="#4A3B33" stroke-width="5"/>
      <path d="M60 200 Q62 160 100 156 Q138 160 140 200" fill="${C.yellow}"/>
      <circle cx="100" cy="128" r="24" fill="${C.skin}"/>
      <path d="M77 128 Q76 102 100 102 Q124 102 123 128 Q116 114 100 114 Q84 114 77 128 Z" fill="${C.yellowD}" stroke-width="4"/>
      <circle cx="61" cy="88" r="3.5" fill="${C.ink}" stroke="none"/><circle cx="79" cy="88" r="3.5" fill="${C.ink}" stroke="none"/>
      <circle cx="121" cy="88" r="3.5" fill="${C.ink}" stroke="none"/><circle cx="139" cy="88" r="3.5" fill="${C.ink}" stroke="none"/>
      <circle cx="92" cy="130" r="3" fill="${C.ink}" stroke="none"/><circle cx="108" cy="130" r="3" fill="${C.ink}" stroke="none"/>
      <path d="M62 100 Q70 106 78 100 M122 100 Q130 106 138 100 M93 138 Q100 143 107 138" stroke-width="4"/>`,
  };

  const FULL = new Set(['scene', 'mom', 'dad', 'sibling', 'doctor', 'police', 'person', 'grandma', 'grandpa']);

  AL.Art = {
    C,
    has: (id) => !!A[id],
    svg(id, label) {
      const fn = A[id] || A.person;
      const aria = label ? ` role="img" aria-label="${AL.escape(label)}"` : ' aria-hidden="true"';
      return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="${FULL.has(id) ? 'full' : ''}"${aria}><g fill="none" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">${fn()}</g></svg>`;
    },
    isFull: (id) => FULL.has(id),
    /* Ilustrácie, z ktorých si rodič môže vybrať pri novej položke */
    catalog: [
      'water', 'food', 'bread', 'yogurt', 'pancakes', 'pasta', 'meat', 'apple', 'toy', 'ball', 'car', 'blocks', 'wc', 'help', 'rest', 'outside', 'hug',
      'tap', 'soap', 'wash', 'towel', 'bath', 'paper', 'flush', 'tshirt', 'pants', 'socks', 'shoes', 'toothpaste', 'toothbrush',
      'chair', 'breathe', 'book', 'drawing', 'music', 'scene', 'hourglass',
      'vacuum', 'dryer', 'baby', 'bell', 'speaker',
      'dog', 'cat', 'cow', 'fish', 'bird',
      'mom', 'dad', 'grandma', 'grandpa', 'sibling', 'doctor', 'police', 'person', 'home', 'playground', 'shop', 'school', 'lost', 'hurt',
    ],
  };

  /* Jednoduché čiarové ikony pre ovládanie (24×24) */
  const I = {
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor"/>',
    volLow: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/>',
    volHigh: '<path d="M3 9.5h3.5L11 6v12l-4.5-3.5H3z" fill="currentColor"/><path d="M14.5 9.5a3.5 3.5 0 0 1 0 5M17 7a7 7 0 0 1 0 10M19.5 4.5a10.5 10.5 0 0 1 0 15"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    home: '<path d="M4 11l8-7 8 7v9h-5v-6h-6v6H4z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"/><circle cx="12" cy="12" r="6.4"/>',
    camera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    image: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 16v4h16v-4"/>',
    arrow: '<path d="M3 12h16M13 6l6 6-6 6"/>',
    back: '<path d="M21 12H5M11 6l-6 6 6 6"/>',
    repeat: '<path d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4"/>',
    hand: '<path d="M9 12V5.5a1.5 1.5 0 0 1 3 0V11M12 10.5V4.5a1.5 1.5 0 0 1 3 0V11M15 10.5V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7h-.6a6 6 0 0 1-4.8-2.4L3.3 15.4a1.6 1.6 0 0 1 2.5-2L9 16.2V12"/>',
    bigCheck: '<path class="check-path" d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.6"/>',
  };

  AL.Icon = function (name, cls) {
    return `<svg viewBox="0 0 24 24" class="${cls || ''}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[name] || ''}</svg>`;
  };
})();
