import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/adminAuth";
import { carregarDadosAoVivo } from "@/lib/aoVivo";

export const dynamic = "force-dynamic";

/** Dados do painel Ao vivo: quem esta com a sala aberta e os comentarios recentes. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await exigirAdmin();
  } catch {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  return NextResponse.json(await carregarDadosAoVivo(id), { headers: { "Cache-Control": "no-store" } });
}
