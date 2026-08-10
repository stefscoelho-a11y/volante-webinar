type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  placeholder?: boolean;
};

export function StatCard({ label, value, hint, placeholder }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${placeholder ? "text-gray-400" : "text-gray-900"}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}
