'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

import { ActionLink } from '@/components/site/primitives';
import type { SubmissionForm } from '@/types/public';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/**
 * The public form. Personal details are optional on purpose (PRD §10): the
 * point is to learn about a creator, not to collect a database of senders.
 */
export function SubmitForm({ form }: { form: SubmissionForm }) {
  const [values, setValues] = useState({
    categoryId: form.categories[0]?.id ?? '',
    creatorNameRaw: '',
    creatorLink: '',
    reason: '',
    submitterName: '',
    submitterEmail: '',
    website: '', // honeypot
  });
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setState('sending');

    try {
      const response = await fetch(`${API}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: values.categoryId,
          creatorNameRaw: values.creatorNameRaw,
          creatorLink: values.creatorLink || undefined,
          reason: values.reason || undefined,
          submitterName: values.submitterName || undefined,
          submitterEmail: values.submitterEmail || undefined,
          website: values.website || undefined,
        }),
      });

      if (response.status === 429) {
        throw new Error('ສົ່ງຖີ່ເກີນໄປ ລອງໃໝ່ໃນອີກໜຶ່ງນາທີ');
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? 'ສົ່ງບໍ່ສຳເລັດ ລອງໃໝ່ອີກຄັ້ງ');
      }
      setState('sent');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ສົ່ງບໍ່ສຳເລັດ');
      setState('idle');
    }
  }

  if (state === 'sent') {
    return (
      <div className="rounded-[var(--radius-box)] border border-brand-edge bg-brand-soft px-6 py-12 text-center">
        <CheckCircle2 className="mx-auto size-10 text-brand-deep" />
        <h2 className="mt-4 font-serif text-2xl text-ink">ຮັບຊື່ແລ້ວ ຂອບໃຈຫຼາຍໆ</h2>
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-ink-2">
          ທີມງານຈະກວດລາຍຊື່ທຸກອັນ · ຖ້າມີຄົນອື່ນອີກທີ່ຢາກເສີນ ສົ່ງເພີ່ມໄດ້ເລີຍ
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              setValues({ ...values, creatorNameRaw: '', creatorLink: '', reason: '' });
              setState('idle');
            }}
            className="rounded-[var(--radius-btn)] bg-brand-deep px-5 py-3 text-[14px] font-semibold text-white hover:bg-brand"
          >
            ສົ່ງອີກຄົນ
          </button>
          <ActionLink href={`/awards/${form.edition.slug}`} tone="quiet">
            ເບິ່ງງານປີນີ້
          </ActionLink>
        </div>
      </div>
    );
  }

  const grouped = form.categories.reduce<Record<string, typeof form.categories>>((groups, category) => {
    (groups[category.groupLo ?? ''] ??= []).push(category);
    return groups;
  }, {});
  const hasGroups = Object.keys(grouped).some((key) => key !== '');

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-[var(--radius-box)] border border-rule bg-panel p-6 md:p-8"
    >
      <Field label="ສາຂາທີ່ຢາກເສີນ" required>
        <select
          required
          value={values.categoryId}
          onChange={(event) => setValues({ ...values, categoryId: event.target.value })}
          className="w-full rounded-[var(--radius-sm)] border border-rule bg-white px-3.5 py-2.5 text-[14px] text-ink"
        >
          {hasGroups
            ? Object.entries(grouped).map(([group, categories]) => (
                <optgroup key={group} label={group || 'ອື່ນໆ'}>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.nameLo}
                    </option>
                  ))}
                </optgroup>
              ))
            : form.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nameLo}
                </option>
              ))}
        </select>
      </Field>

      <Field label="ຊື່ຜູ້ສ້າງສັນ" required help="ຂຽນຕາມທີ່ຄົນຮູ້ຈັກ — ຊື່ເພຈ ຫຼື ຊື່ຈິງກໍໄດ້">
        <Input
          required
          maxLength={160}
          value={values.creatorNameRaw}
          onChange={(event) => setValues({ ...values, creatorNameRaw: event.target.value })}
        />
      </Field>

      <Field label="ລິງກ໌ຊ່ອງທາງ" help="Facebook, TikTok, YouTube ຫຼື Instagram — ຊ່ວຍໃຫ້ທີມງານຫາເຈົ້າຕົວໄດ້">
        <Input
          type="url"
          placeholder="https://…"
          value={values.creatorLink}
          onChange={(event) => setValues({ ...values, creatorLink: event.target.value })}
        />
      </Field>

      <Field label="ເປັນຫຍັງຄວນໄດ້ລາງວັນ" help="ບອກສັ້ນໆກໍພໍ ຊ່ວຍທີມງານໄດ້ຫຼາຍ">
        <textarea
          maxLength={1000}
          rows={4}
          value={values.reason}
          onChange={(event) => setValues({ ...values, reason: event.target.value })}
          className="w-full resize-y rounded-[var(--radius-sm)] border border-rule bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-ink"
        />
      </Field>

      <fieldset className="mt-6 border-t border-hairline pt-5">
        <legend className="sr-only">ຂໍ້ມູນຜູ້ສົ່ງ</legend>
        <p className="mb-4 text-[12.5px] text-ink-3">
          ສອງຊ່ອງລຸ່ມນີ້ <b className="text-ink-2">ບໍ່ບັງຄັບ</b> — ບໍ່ໃສ່ກໍສົ່ງໄດ້ປົກກະຕິ
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ຊື່ຂອງທ່ານ">
            <Input
              value={values.submitterName}
              onChange={(event) => setValues({ ...values, submitterName: event.target.value })}
            />
          </Field>
          <Field label="ອີເມວ">
            <Input
              type="email"
              value={values.submitterEmail}
              onChange={(event) => setValues({ ...values, submitterEmail: event.target.value })}
            />
          </Field>
        </div>
      </fieldset>

      {/* Hidden from people, irresistible to bots. */}
      <div aria-hidden className="absolute left-[-9999px]">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(event) => setValues({ ...values, website: event.target.value })}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-[var(--radius-sm)] border border-[#e4c1b7] bg-stop-soft px-3.5 py-2.5 text-[13.5px] text-stop">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'sending'}
        className="mt-6 w-full rounded-[var(--radius-btn)] bg-brand-deep px-5 py-3.5 text-[15px] font-semibold text-white hover:bg-brand disabled:opacity-50"
      >
        {state === 'sending' ? 'ກຳລັງສົ່ງ…' : 'ສົ່ງລາຍຊື່'}
      </button>
    </form>
  );
}

function Field({
  label,
  help,
  required,
  children,
}: {
  label: string;
  help?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-5 block last:mb-0">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">
        {label}
        {required && <span className="ml-1 text-brand-deep">*</span>}
      </span>
      {children}
      {help && <span className="mt-1.5 block text-[12px] text-ink-3">{help}</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-[var(--radius-sm)] border border-rule bg-white px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-3"
    />
  );
}
