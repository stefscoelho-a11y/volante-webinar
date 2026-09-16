// Grafico ILUSTRATIVO: os valores abaixo sao fixos, so pra mostrar como a
// visualizacao vai ficar quando tivermos o rastreamento real de audiencia
// assistida (quanto tempo cada espectador ficou no video). Nao reflete
// audiencia de verdade - isso ainda nao e coletado.
const PONTOS_EXEMPLO = [100, 97, 93, 88, 82, 77, 72, 66, 61, 57, 52, 48, 45];

const WIDTH = 600;
const HEIGHT = 180;

export function RetentionChartExample() {
  const max = 100;
  const stepX = WIDTH / (PONTOS_EXEMPLO.length - 1);
  const coords = PONTOS_EXEMPLO.map((v, i) => [i * stepX, HEIGHT - (v / max) * HEIGHT]);
  const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const areaPath = `${linePath} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-800">Retenção média do webinário</h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
          Exemplo ilustrativo
        </span>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        Depende do rastreamento de audiência assistida (ainda não implementado) para mostrar dados reais.
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="retention-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={0} x2={WIDTH} y1={HEIGHT * f} y2={HEIGHT * f} stroke="#27272a" strokeWidth={1} />
        ))}
        <path d={areaPath} fill="url(#retention-fill)" />
        <path d={linePath} fill="none" stroke="#f97316" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-gray-400">
        <span>Início</span>
        <span>Pitch</span>
        <span>Fim</span>
      </div>
    </div>
  );
}
