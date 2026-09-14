type LinksAcessoConfigFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  tipoAgendamento: string;
  values: {
    exigirCadastro: boolean;
    justInTimeAtivo: boolean;
    delayJustInTimeMinutos: number | null;
    replayAtivo: boolean;
    // Ja formatados pra <input type="datetime-local">, em horario de Brasilia
    replayLiberarEm: string;
    replayExpirarEm: string;
    replayDuracaoHoras: number | null;
  };
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm outline-none focus:border-emerald-500";

export function LinksAcessoConfigForm({ action, tipoAgendamento, values }: LinksAcessoConfigFormProps) {
  return (
    <form action={action} className="space-y-6">
      <Section title="Cadastro" description="O que acontece antes de entrar pela sala principal.">
        <Checkbox
          name="exigirCadastro"
          defaultChecked={values.exigirCadastro}
          label="Pedir nome e email antes de entrar na sala"
          hint="Desligado, a pessoa entra direto. O magic link sempre pula o cadastro, porque os dados já vêm na URL."
        />
      </Section>

      <Section title="Just in time" description="A sala abre alguns minutos depois do cadastro de cada pessoa.">
        {tipoAgendamento === "just_in_time" ? (
          <p className="text-xs text-gray-500">
            O agendamento deste webinário já é just in time: a sala principal e o link just in time levam ao mesmo
            cadastro.
          </p>
        ) : (
          <Checkbox
            name="justInTimeAtivo"
            defaultChecked={values.justInTimeAtivo}
            label="Habilitar os links just in time"
            hint="Funciona junto com o agendamento: a sala principal continua seguindo o agendamento e os links just in time seguem o cadastro."
          />
        )}
        <Field label="A sala abre quantos minutos após o cadastro">
          <input
            type="number"
            name="delayJustInTimeMinutos"
            min={0}
            defaultValue={values.delayJustInTimeMinutos ?? 10}
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="Replay" description="Gravação liberada só depois da sessão.">
        <Checkbox
          name="replayAtivo"
          defaultChecked={values.replayAtivo}
          label="Habilitar o link de replay"
          hint="Desligado, o link avisa que o replay não está disponível."
        />
        <p className="text-xs text-gray-500">
          Quando abre: para quem se cadastrou, depois do fim da sessão da própria pessoa. Sem cadastro, depois da
          primeira sessão (agendado) ou na hora (recorrente e fixo, que sempre já tiveram uma sessão antes).
        </p>
        <Field label="Liberar numa data específica (opcional, horário de Brasília)">
          <input
            type="datetime-local"
            name="replayLiberarEm"
            defaultValue={values.replayLiberarEm}
            className={inputClass}
          />
        </Field>
        <p className="-mt-2 text-xs text-gray-500">Preenchida, substitui a regra acima: o replay abre nessa data para todos.</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Disponível por (horas após liberar)">
            <input
              type="number"
              name="replayDuracaoHoras"
              min={1}
              defaultValue={values.replayDuracaoHoras ?? ""}
              placeholder="ex: 48"
              className={inputClass}
            />
          </Field>
          <Field label="Expira em (horário de Brasília)">
            <input
              type="datetime-local"
              name="replayExpirarEm"
              defaultValue={values.replayExpirarEm}
              className={inputClass}
            />
          </Field>
        </div>
        <p className="-mt-2 text-xs text-gray-500">
          Os dois prazos são opcionais; com os dois preenchidos, vale o que vencer primeiro. O prazo em horas só se
          aplica quando há uma data de liberação (sessão do participante, primeira sessão ou data marcada).
        </p>
      </Section>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
        >
          Salvar configurações
        </button>
      </div>
    </form>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <p className="mb-4 mt-0.5 text-xs text-gray-500">{description}</p>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-gray-500">{label}</label>
      {children}
    </div>
  );
}

function Checkbox({
  name,
  defaultChecked,
  label,
  hint,
}: {
  name: string;
  defaultChecked: boolean;
  label: string;
  hint: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4" />
        {label}
      </label>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
}
