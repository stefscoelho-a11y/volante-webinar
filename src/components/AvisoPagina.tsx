export function AvisoPagina({ titulo, mensagem }: { titulo: string; mensagem?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center text-gray-900">
      <div>
        <h1 className="text-xl font-semibold">{titulo}</h1>
        {mensagem && <p className="mt-2 text-gray-500">{mensagem}</p>}
      </div>
    </div>
  );
}
