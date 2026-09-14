export const TEMAS_SALA = ["hotwebinar", "youtube"] as const;
export type TemaSala = (typeof TEMAS_SALA)[number];

export const FONTES_SALA = ["Inter", "Roboto", "Montserrat", "Open Sans"] as const;
export type FonteSala = (typeof FONTES_SALA)[number];

export const VISUAL_DEFAULTS = {
  temaSala: "hotwebinar" as TemaSala,
  corPrimaria: "#e11d48",
  corFundo: "#fafaf8",
  corTexto: "#18181b",
  fonteSala: "Inter" as FonteSala,
};

export function parseTemaSala(value: unknown): TemaSala {
  return TEMAS_SALA.includes(value as TemaSala) ? (value as TemaSala) : VISUAL_DEFAULTS.temaSala;
}

export function parseFonteSala(value: unknown): FonteSala {
  return FONTES_SALA.includes(value as FonteSala) ? (value as FonteSala) : VISUAL_DEFAULTS.fonteSala;
}

export function parseHexColor(value: unknown, fallback: string): string {
  const color = String(value ?? "").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
}

export function getContrastColor(hex: string): "#ffffff" | "#111111" {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.58 ? "#111111" : "#ffffff";
}
