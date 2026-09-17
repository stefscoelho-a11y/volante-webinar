import type { PontoRetencao } from "@/lib/youtubeAnalytics";

const WIDTH = 600;
const HEIGHT = 180;

type RetentionChartRealProps = {
  pontos: PontoRetencao[];
};

/** Curva de retencao real, puxada da YouTube Analytics API (ver src/lib/youtubeAnalytics.ts). */
export function RetentionChartReal({ pontos }: RetentionChartRealProps) {
  const coords = pontos.map((p) => [
    Math.min(1, Math.max(0, p.elapsedVideoTimeRatio)) * WIDTH,
    HEIGHT - Math.min(1, Math.max(0, p.audienceWatchRatio)) * HEIGHT,
  ]);
  const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const areaPath = `${linePath} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="retention-fill-real" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={0} x2={WIDTH} y1={HEIGHT * f} y2={HEIGHT * f} stroke="#27272a" strokeWidth={1} />
      ))}
      <path d={areaPath} fill="url(#retention-fill-real)" />
      <path d={linePath} fill="none" stroke="#f97316" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
