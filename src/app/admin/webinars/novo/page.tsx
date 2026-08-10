import { WebinarForm } from "@/components/admin/WebinarForm";
import { createWebinar } from "../actions";

export default function NovoWebinarPage() {
  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-xl font-semibold">Novo webinario</h1>
      <WebinarForm action={createWebinar} submitLabel="Criar webinario" />
    </div>
  );
}
