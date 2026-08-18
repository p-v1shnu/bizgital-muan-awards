'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

import { ActionLink } from '@/components/site/primitives';
import { useDebounced } from '@/lib/use-debounced';
import type { OpenSubmissionForm } from '@/types/public';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

declare global {
  interface Window {
    gtag?: (command: string, event: string, params?: Record<string, unknown>) => void;
  }
}

/**
 * The public form. Personal details are optional on purpose (PRD §10): the
 * point is to learn about a creator, not to collect a database of senders.
 */
export function SubmitForm({ form }: { form: OpenSubmissionForm }) {
  const [values, setValues] = useState({
    categoryId: form.categories[0]?.id ?? '',
    creatorNameRaw: '',
    creatorLink: '',
    reason: '',
    submitterName: '',
    submitterEmail: '',
    website: '', // honeypot
  });
  const [categoryFilter, setCategoryFilter] = useState('');
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

      // The server's own message says what happened and what to do about it,
      // in Lao, and knows the actual limit. This used to overwrite it with
      // "try again in a minute" — for a limit measured in hours.
      if (response.status === 429) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? 'ສົ່ງຖີ່ເກີນໄປ ກະລຸນາລໍຖ້າແລ້ວລອງໃໝ່');
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? 'Could not send this entry. Please try again.');
      }
      setState('sent');
      // The number PRD §2 leads with: entries sent, split by category. Guarded
      // because gtag only exists once analytics is configured for the build.
      window.gtag?.('event', 'submission_sent', { category_id: values.categoryId });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send this entry.');
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
            className="rounded-[var(--radius-btn)] bg-ink px-5 py-3 text-[14px] font-semibold text-white hover:bg-brand-deep"
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

  // A year may run to forty categories (PRD §7.6), and scrolling a list that
  // long on a phone is miserable — past fifteen a filter box appears above it.
  const needle = categoryFilter.trim().toLowerCase();
  const visibleCategories = needle
    ? form.categories.filter((category) =>
        `${category.nameLo} ${category.groupLo ?? ''}`.toLowerCase().includes(needle),
      )
    : form.categories;

  const grouped = visibleCategories.reduce<Record<string, typeof form.categories>>(
    (groups, category) => {
      (groups[category.groupLo ?? ''] ??= []).push(category);
      return groups;
    },
    {},
  );
  const hasGroups = Object.keys(grouped).some((key) => key !== '');

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-[var(--radius-box)] border border-rule bg-panel p-6 md:p-8"
    >
      <Field label="ສາຂາທີ່ຢາກເສີນ" required>
        {form.categories.length > 15 && (
          <Input
            type="search"
            placeholder="ກັ່ນຕອງສາຂາ…"
            aria-label="ກັ່ນຕອງສາຂາ"
            className="mb-2"
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              // Filtering can hide what was chosen; move to the first match
              // rather than leaving the form pointing at something invisible.
              const term = event.target.value.trim().toLowerCase();
              const stillVisible = form.categories.filter((category) =>
                `${category.nameLo} ${category.groupLo ?? ''}`.toLowerCase().includes(term),
              );
              if (!stillVisible.some((category) => category.id === values.categoryId)) {
                setValues((current) => ({ ...current, categoryId: stillVisible[0]?.id ?? '' }));
              }
            }}
          />
        )}
        <select
          required
          value={values.categoryId}
          onChange={(event) => setValues({ ...values, categoryId: event.target.value })}
          className="w-full rounded-[var(--radius-sm)] border border-rule bg-white px-3.5 py-2.5 text-[14px] text-ink"
        >
          {/* Both branches read the filtered list. The ungrouped one used to
              render every category regardless — so on a year that leaves
              groupLo blank, typing in the filter box narrowed nothing while
              quietly moving the selection to the first match. The sender saw
              the whole list, their choice changed under them, and the entry
              went to a category they had not picked. */}
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
            : visibleCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nameLo}
                </option>
              ))}
        </select>
        {needle && visibleCategories.length === 0 && (
          <p className="mt-1.5 text-[12.5px] text-stop">ບໍ່ພົບສາຂາທີ່ກົງກັບ “{categoryFilter}”</p>
        )}
      </Field>

      <CreatorNameField
        value={values.creatorNameRaw}
        onChange={(creatorNameRaw) => setValues({ ...values, creatorNameRaw })}
      />

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
        {/*
          This line used to repeat "deleted within 12 months". That period is the
          team's to set and it lives in the privacy policy they now edit, so this
          points at the policy instead of restating it — which is how the two
          stop being able to disagree with each other.
        */}
        <p className="mb-4 text-[12.5px] text-ink-3">
          ສອງຊ່ອງລຸ່ມນີ້ <b className="text-ink-2">ບໍ່ບັງຄັບ</b> — ບໍ່ໃສ່ກໍສົ່ງໄດ້ປົກກະຕິ ·
          ໃຊ້ສະເພາະເມື່ອທີມງານຕ້ອງຖາມກັບ ແລະ ຖືກລຶບຕາມກຳນົດທີ່ບອກໄວ້ໃນ{' '}
          <a href="/about#privacy" className="text-brand-deep underline">
            ໜ້າຂໍ້ມູນສ່ວນຕົວ
          </a>
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
        className="mt-6 w-full rounded-[var(--radius-btn)] bg-ink px-5 py-3.5 text-[15px] font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
      >
        {state === 'sending' ? 'ກຳລັງສົ່ງ…' : 'ສົ່ງລາຍຊື່'}
      </button>
    </form>
  );
}

interface Suggestion {
  slug: string;
  nameLo: string;
  nameEn: string | null;
}

/**
 * The name field, with suggestions drawn from creators already in the library
 * (PRD §6.2). The same person gets sent in spelled five different ways, and
 * every variant becomes a row the team has to merge by hand — offering the
 * spelling already on record cuts that work at the source.
 *
 * Picking a suggestion only fills the box: the value still goes through the
 * normal queue, because a matching name is not proof it is the same person.
 */
function CreatorNameField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Suggestions follow what was typed, not what was chosen — filling the box
  // from the list would otherwise immediately ask for that exact name again.
  const [typed, setTyped] = useState('');
  const term = useDebounced(typed, 250);

  const query = term.trim();

  useEffect(() => {
    // Nothing to fetch on a short term, and nothing to clear either: the list
    // on screen is derived from the term below, so a stale row cannot outlive
    // the word it was found for.
    if (query.length < 2) return;

    // A slower earlier response must not overwrite a newer one.
    const cancel = new AbortController();
    fetch(`${API}/creator-suggestions?q=${encodeURIComponent(query)}`, { signal: cancel.signal })
      // Every API response is wrapped as { data }, so the rows are one level in.
      .then((response) => (response.ok ? response.json() : { data: [] }))
      .then((payload: { data?: Suggestion[] }) => {
        setSuggestions(payload.data ?? []);
        setActive(-1);
      })
      // A failed lookup is not worth showing: the field works without it.
      .catch(() => undefined);

    return () => cancel.abort();
  }, [query]);

  const rows = query.length >= 2 ? suggestions : [];
  const visible = open && rows.length > 0;

  function choose(suggestion: Suggestion) {
    onChange(suggestion.nameLo);
    setTyped('');
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div className="relative mb-5">
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">
          ຊື່ຜູ້ສ້າງສັນ<span className="ml-1 text-brand-deep">*</span>
        </span>
        <Input
          required
          maxLength={160}
          role="combobox"
          aria-expanded={visible}
          aria-controls="creator-suggestions"
          aria-autocomplete="list"
          autoComplete="off"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setTyped(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // Blur fires before a click on an option registers, so closing waits
          // a tick — otherwise the list vanishes out from under the pointer.
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (!visible) return;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive((index) => (index + 1) % rows.length);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((index) => (index <= 0 ? rows.length - 1 : index - 1));
            } else if (event.key === 'Enter' && active >= 0) {
              event.preventDefault();
              choose(rows[active]);
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
      </label>
      <span className="mt-1.5 block text-[12px] text-ink-3">
        ຂຽນຕາມທີ່ຄົນຮູ້ຈັກ — ຊື່ເພຈ ຫຼື ຊື່ຈິງກໍໄດ້
      </span>

      {visible && (
        <ul
          id="creator-suggestions"
          role="listbox"
          aria-label="ຊື່ທີ່ມີຢູ່ແລ້ວ"
          className="absolute inset-x-0 top-[70px] z-20 overflow-hidden rounded-[var(--radius-sm)] border border-rule bg-white shadow-lg"
        >
          <li className="border-b border-hairline px-3.5 py-2 text-[11.5px] text-ink-3">
            ເຄີຍມີໃນລະບົບ — ເລືອກໄດ້ເພື່ອໃຫ້ຂຽນຄືກັນ
          </li>
          {rows.map((suggestion, index) => (
            <li key={suggestion.slug} role="option" aria-selected={index === active}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(suggestion)}
                onMouseEnter={() => setActive(index)}
                className={`block w-full px-3.5 py-2.5 text-left text-[14px] ${
                  index === active ? 'bg-brand-soft text-brand-deep' : 'text-ink'
                }`}
              >
                {suggestion.nameLo}
                {suggestion.nameEn && (
                  <span className="ml-2 text-[12px] text-ink-3">{suggestion.nameEn}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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
