export type WebinarBaseOferta = {
  ofertaNome: string | null;
  ofertaTitulo: string | null;
  ofertaImagemUrl: string | null;
  ofertaDescricao: string | null;
  precoOriginal: number | null;
  precoOferta: number | null;
  precoParcelado: string | null;
  ctaTexto: string;
  ctaLink: string;
  ctaCountdownMinutos: number | null;
  ctaDesaparecerSegundos: number | null;
  metaPixelId: string | null;
};

export type CanalOfertaFormValues = {
  nome: string;
  slug: string;
  ofertaNome: string | null;
  ofertaTitulo: string | null;
  ofertaImagemUrl: string | null;
  ofertaDescricao: string | null;
  precoOriginal: number | null;
  precoOferta: number | null;
  precoParcelado: string | null;
  ctaTexto: string | null;
  ctaLink: string | null;
  ctaCountdownMinutos: number | null;
  ctaDesaparecerSegundos: number | null;
  metaPixelId: string | null;
};

type CanalOfertaFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  values?: CanalOfertaFormValues;
  botao: string;
  webinarBase: WebinarBaseOferta;
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-orange-500";

export function CanalOfertaForm({ action, values, botao, webinarBase }: CanalOfertaFormProps) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nome do canal (só você vê)">
          <input name="nome" required defaultValue={values?.nome} placeholder="Ex: Live tráfego" className={inputClass} />
        </Field>
        <Field label="Identificador no link (?c=)">
          <input
            name="slug"
            defaultValue={values?.slug}
            placeholder="gerado do nome, se deixar em branco"
            pattern="[a-z0-9-]*"
            className={`${inputClass} font-mono`}
          />
        </Field>
      </div>

      <p className="text-xs text-gray-500">
        Deixe um campo abaixo em branco para usar o valor da oferta principal do webinário (mostrado como sugestão em
        cada campo).
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nome da oferta">
          <input
            name="ofertaNome"
            defaultValue={values?.ofertaNome ?? ""}
            placeholder={webinarBase.ofertaNome ?? "—"}
            className={inputClass}
          />
        </Field>
        <Field label="Título da oferta">
          <input
            name="ofertaTitulo"
            defaultValue={values?.ofertaTitulo ?? ""}
            placeholder={webinarBase.ofertaTitulo ?? "—"}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Imagem da oferta (URL)">
        <input
          name="ofertaImagemUrl"
          defaultValue={values?.ofertaImagemUrl ?? ""}
          placeholder={webinarBase.ofertaImagemUrl ?? "—"}
          className={inputClass}
        />
      </Field>

      <Field label="Descrição / urgência da oferta">
        <input
          name="ofertaDescricao"
          defaultValue={values?.ofertaDescricao ?? ""}
          placeholder={webinarBase.ofertaDescricao ?? "—"}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Preço original (R$)">
          <input
            type="number"
            step="0.01"
            min={0}
            name="precoOriginal"
            defaultValue={values?.precoOriginal ?? ""}
            placeholder={webinarBase.precoOriginal != null ? String(webinarBase.precoOriginal) : "—"}
            className={inputClass}
          />
        </Field>
        <Field label="Preço da oferta (R$)">
          <input
            type="number"
            step="0.01"
            min={0}
            name="precoOferta"
            defaultValue={values?.precoOferta ?? ""}
            placeholder={webinarBase.precoOferta != null ? String(webinarBase.precoOferta) : "—"}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Preço parcelado (texto livre)">
        <input
          name="precoParcelado"
          defaultValue={values?.precoParcelado ?? ""}
          placeholder={webinarBase.precoParcelado ?? "Ex: 10x de R$ 19,90"}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Texto do botão (CTA)">
          <input
            name="ctaTexto"
            defaultValue={values?.ctaTexto ?? ""}
            placeholder={webinarBase.ctaTexto}
            className={inputClass}
          />
        </Field>
        <Field label="Link do botão (CTA)">
          <input
            name="ctaLink"
            defaultValue={values?.ctaLink ?? ""}
            placeholder={webinarBase.ctaLink}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Contagem regressiva (minutos)">
          <input
            type="number"
            min={0}
            name="ctaCountdownMinutos"
            defaultValue={values?.ctaCountdownMinutos ?? ""}
            placeholder={webinarBase.ctaCountdownMinutos != null ? String(webinarBase.ctaCountdownMinutos) : "—"}
            className={inputClass}
          />
        </Field>
        <Field label="Some no segundo (do vídeo)">
          <input
            type="number"
            min={0}
            name="ctaDesaparecerSegundos"
            defaultValue={values?.ctaDesaparecerSegundos ?? ""}
            placeholder={webinarBase.ctaDesaparecerSegundos != null ? String(webinarBase.ctaDesaparecerSegundos) : "—"}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Meta Pixel ID">
        <input
          name="metaPixelId"
          defaultValue={values?.metaPixelId ?? ""}
          placeholder={webinarBase.metaPixelId ?? "—"}
          className={inputClass}
        />
      </Field>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-orange-400"
        >
          {botao}
        </button>
      </div>
    </form>
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
