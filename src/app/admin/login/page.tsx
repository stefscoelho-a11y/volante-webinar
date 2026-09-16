import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ erro?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { erro, next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-gray-900">
      <form action={login} className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="mb-4 text-lg font-semibold">Acesso ao painel admin</h1>

        <input type="hidden" name="next" value={next ?? "/admin/webinars"} />

        <label className="mb-1 block text-sm text-gray-500" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoFocus
          required
          className="mb-3 w-full rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm outline-none focus:border-orange-500"
        />

        {erro && <p className="mb-3 text-sm text-red-600">Senha incorreta.</p>}

        <button
          type="submit"
          className="w-full rounded bg-orange-500 px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-orange-400"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
