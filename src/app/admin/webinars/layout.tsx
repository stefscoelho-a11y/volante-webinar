import { AdminShell } from "@/components/admin/AdminShell";

export default function WebinarsLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
