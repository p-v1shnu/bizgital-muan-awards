'use client';

import { useEffect } from 'react';

/**
 * The last line of defence. It carries no header or footer on purpose: if
 * something upstream is broken, the chrome may be what broke.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Goes to stdout and on into the container logs (PRD §8 rule 6).
    console.error('Unhandled page error', error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5">
      <div className="max-w-md text-center">
        <div className="foil mx-auto mb-6 h-[3px] w-16 rounded-sm" aria-hidden />
        <h1 className="font-serif text-3xl text-ink">ມີບາງຢ່າງຜິດພາດ</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
          ລອງໂຫລດໃໝ່ອີກຄັ້ງ · ຖ້າຍັງເປັນຢູ່ ກະລຸນາແຈ້ງທີມງານ
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-[var(--radius-btn)] bg-brand-deep px-5 py-3 text-[14px] font-semibold text-white hover:bg-brand"
          >
            ລອງໃໝ່
          </button>
          <a
            href="/"
            className="rounded-[var(--radius-btn)] border border-rule bg-panel px-5 py-3 text-[14px] font-semibold text-ink-2 hover:bg-panel-2 hover:text-ink"
          >
            ກັບໜ້າແຮກ
          </a>
        </div>

        {/* The digest is what ties this page to a line in the logs. */}
        {error.digest && <p className="mt-8 font-mono text-[11px] text-ink-3">{error.digest}</p>}
      </div>
    </main>
  );
}
