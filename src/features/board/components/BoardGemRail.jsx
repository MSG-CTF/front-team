import { useId, useMemo } from "react";
import { getBoardGemRailGeometry, formatRailPoints, BOARD_GEM_RAIL_PALETTES } from "../utils/boardGemRail.js";
import styles from "./BoardScreen.module.css";

// 승인된 확대 시안과 동일한 금속 받침/보석 면/bevel. 원본 이미지는 가공하지 않는다.
export default function BoardGemRail({ cellIndexes, startAngle, endAngle, palette = BOARD_GEM_RAIL_PALETTES[0], isInteractive = false }) {
  const id = `gem-${useId().replace(/:/g, "")}`;
  const geometry = useMemo(() => getBoardGemRailGeometry(cellIndexes, {startAngle, endAngle}), [cellIndexes, startAngle, endAngle]);
  if (!geometry) return null;
  // 재질 구조는 유지하며 금테 방향으로 3px 밀착시킨다. 면 내부 dim은 건드리지 않는다.
  const strip = (inner, outer) => geometry.strip(inner - 3, outer - 3);
  const inner = geometry.offset(17);
  const outer = geometry.offset(25);
  const url = name => `url(#${id}-${name})`;
  return <g data-gem-rail={palette.key} clipPath={geometry.clipPath ? url("boundary") : undefined}>
    <defs>
      {geometry.clipPath && <clipPath id={`${id}-boundary`} data-rail-boundary="true"><path d={geometry.clipPath}/></clipPath>}
      <linearGradient id={`${id}-bronze`} x1="0" y1="0" x2=".3" y2="1"><stop stopColor="#a67b4c"/><stop offset=".22" stopColor="#4d2e20"/><stop offset=".55" stopColor="#81562f"/><stop offset=".72" stopColor="#b48c56"/><stop offset="1" stopColor="#3b291c"/></linearGradient>
      <linearGradient id={`${id}-stone`} x1="0" y1="0" x2=".6" y2="1"><stop stopColor={palette.light}/><stop offset=".24" stopColor={palette.mid}/><stop offset=".5" stopColor={palette.dark}/><stop offset=".78" stopColor={palette.mid}/><stop offset="1" stopColor={palette.light}/></linearGradient>
      <linearGradient id={`${id}-bevel`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={palette.edge}/><stop offset=".55" stopColor={palette.light}/><stop offset="1" stopColor={palette.mid}/></linearGradient>
      <clipPath id={`${id}-face`}><path d={strip(20, 28)}/></clipPath>
      {inner.slice(0, -1).map((point, i) => <linearGradient key={i} id={`${id}-facet-${i}`} gradientUnits="userSpaceOnUse"
        x1={(point[0] + inner[i + 1][0]) / 2} y1={(point[1] + inner[i + 1][1]) / 2}
        x2={(outer[i][0] + outer[i + 1][0]) / 2} y2={(outer[i][1] + outer[i + 1][1]) / 2}>
        <stop stopColor={palette.light}/><stop offset=".22" stopColor={palette.mid}/><stop offset=".6" stopColor={palette.dark}/><stop offset=".9" stopColor={palette.mid}/><stop offset="1" stopColor={palette.light}/>
      </linearGradient>)}
      <filter id={`${id}-material`} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency=".38" numOctaves="2" seed="8" result="grain"/>
        <feColorMatrix in="grain" type="saturate" values="0" result="grayGrain"/>
        <feComposite in="grayGrain" in2="SourceAlpha" operator="in" result="clippedGrain"/>
        <feComponentTransfer in="clippedGrain" result="faintGrain"><feFuncA type="linear" slope=".045"/></feComponentTransfer>
        <feBlend in="SourceGraphic" in2="faintGrain" mode="soft-light"/>
      </filter>
      <filter id={`${id}-bloom`} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation="2.4" />
      </filter>
      <filter id={`${id}-reflection`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation="1.1" />
      </filter>
    </defs>
    <path d={strip(16, 32)} fill="#160f0b" fillOpacity=".48" />
    {/* 반사광은 금테와 맞닿은 바깥 변에만 제한한다. 칸 전체 border가 아니다. */}
    <path d={strip(15, 19)} fill={palette.bloom} fillOpacity=".18" filter={url("reflection")} data-rail-reflection="true" />
    <g filter={url("material")}>
      <path d={strip(17, 31)} fill={url("bronze")} />
      <path d={strip(18.5, 29.5)} fill={palette.dark} />
      <path d={strip(20, 28)} fill={url("stone")} />
      <g clipPath={url("face")}>{inner.slice(0, -1).map((p, i) => <polygon key={i}
        points={formatRailPoints([p, inner[i + 1], outer[i + 1], outer[i]])} fill={url(`facet-${i}`)} />)}</g>
      <path d={strip(18.5, 20.5)} fill={url("bevel")} />
      <path d={strip(27.5, 29.5)} fill={palette.dark} />
      <path d={strip(18.5, 19)} fill={palette.edge} fillOpacity=".42" />
      <path d={strip(30, 31)} fill="#b28b59" fillOpacity=".45" />
      {inner.slice(0, -1).map((p, i) => <polygon key={i} points={formatRailPoints([p, inner[i + 1], outer[i + 1], outer[i]])}
        fill={i % 3 === 0 ? palette.light : palette.dark} fillOpacity={i % 3 === 0 ? .1 : .06} />)}
    </g>
    {/* 보석색 몸체 → 밝은 안쪽 core → 좁고 약한 bloom. 바깥 받침은 어둡게 남긴다. */}
    <path d={strip(18.2, 21.1)} fill={palette.bloom} fillOpacity=".58" filter={url("bloom")} data-rail-bloom="true" />
    <path d={strip(18.2, 20.4)} fill={palette.bloom} fillOpacity=".72" />
    <path d={strip(18.65, 20)} fill={palette.core} fillOpacity=".94" data-rail-core="true" />
    {isInteractive && <path d={strip(16, 32)} className={styles.lineAccentHitArea} aria-hidden="true" />}
  </g>;
}
