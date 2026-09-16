type CadastroFormProps = {
  titulo: string;
  descricao: string;
  botao: string;
  action: (formData: FormData) => void | Promise<void>;
  // Ex: UTMs da URL, repassadas junto com o cadastro
  camposOcultos?: Record<string, string>;
  nomeInicial?: string;
  emailInicial?: string;
};

export function CadastroForm({
  titulo,
  descricao,
  botao,
  action,
  camposOcultos,
  nomeInicial,
  emailInicial,
}: CadastroFormProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-gray-900">
      <form action={action} className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="mb-1 text-xl font-semibold">{titulo}</h1>
        <p className="mb-4 text-sm text-gray-500">{descricao}</p>

        {Object.entries(camposOcultos ?? {}).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

        <label className="mb-1 block text-sm text-gray-500" htmlFor="nome">
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          required
          defaultValue={nomeInicial}
          className="mb-3 w-full rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm outline-none focus:border-orange-500"
        />

        <label className="mb-1 block text-sm text-gray-500" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={emailInicial}
          className="mb-4 w-full rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm outline-none focus:border-orange-500"
        />

        <button
          type="submit"
          className="w-full rounded bg-orange-500 px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-orange-400"
        >
          {botao}
        </button>
      </form>
    </div>
  );
}
