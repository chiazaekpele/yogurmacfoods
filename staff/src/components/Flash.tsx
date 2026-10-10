// Shows the message an action redirected back with (see backWith in lib/forms.ts).
export async function Flash({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const error = typeof sp.error === "string" ? sp.error : null;
  if (!ok && !error) return null;
  return (
    <div className={error ? "form-err" : "form-ok"} role={error ? "alert" : "status"} style={{ marginBottom: 18 }}>
      {error ?? ok}
    </div>
  );
}
