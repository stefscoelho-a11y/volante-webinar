import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Mesmo visual da marca do admin (ver Marca em AdminShell.tsx): quadrado
// laranja arredondado com um triangulo de "play" escuro no centro.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f97316",
          borderRadius: 14,
        }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="#171717">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
