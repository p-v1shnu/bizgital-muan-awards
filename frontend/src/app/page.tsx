/**
 * Scaffold placeholder. The real homepage is built in M3 from
 * docs/design/home.html — this page exists so the token and font wiring can be
 * checked in a browser today.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-20">
      <div className="h-px w-24 foil" />

      <h1 className="font-serif text-5xl leading-tight text-ink">ມ່ວນ ອະວອດ</h1>

      <p className="max-w-prose text-ink-2">
        ລາງວັນປະຈຳປີສຳລັບຜູ້ສ້າງສັນຄອນເທັນລາວ — Muan Awards
      </p>

      <div className="rounded-[var(--radius-box)] border border-rule bg-panel p-6">
        <p className="text-sm text-ink-3">
          M1 scaffold. Design tokens, fonts and the API client are wired up; pages land in M3.
        </p>
      </div>
    </main>
  );
}
