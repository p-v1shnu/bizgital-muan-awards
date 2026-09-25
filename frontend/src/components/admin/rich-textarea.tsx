'use client';

import { useRef } from 'react';
import { Bold, Italic, Link as LinkIcon } from 'lucide-react';

import { Textarea } from '@/components/ui/field';
import { cn } from '@/lib/utils';

/**
 * A Textarea with a small toolbar that wraps the current selection in the
 * site's lightweight rich-text syntax — **bold**, *italic*, [text](url) —
 * which <RichText> (components/site/primitives.tsx) parses back into real
 * elements wherever the field is shown on the public site. What is stored
 * and sent to the API is still plain text, never HTML: the toolbar just
 * saves the team from typing the punctuation by hand.
 *
 * Drop-in for Textarea wherever a body field should take formatting — same
 * props, so swapping one for the other is the whole change.
 */
export function RichTextarea({
  value,
  onChange,
  className,
  ...props
}: {
  value: string;
  onChange: (next: string) => void;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Wraps the current selection (or, with nothing selected, inserts an empty
  // pair with the caret left in between) in `mark` on both sides.
  function wrap(mark: string) {
    const node = ref.current;
    if (!node) return;
    const { selectionStart, selectionEnd } = node;
    const selected = value.slice(selectionStart, selectionEnd);
    const next = value.slice(0, selectionStart) + mark + selected + mark + value.slice(selectionEnd);
    onChange(next);
    // The DOM still holds the old, shorter value on this tick — placing the
    // caret has to wait a frame or it lands where that value would put it.
    requestAnimationFrame(() => {
      node.focus();
      node.setSelectionRange(selectionStart + mark.length, selectionEnd + mark.length);
    });
  }

  function link() {
    const node = ref.current;
    if (!node) return;
    const { selectionStart, selectionEnd } = node;
    const selected = value.slice(selectionStart, selectionEnd) || 'ຂໍ້ຄວາມລິງກ໌';
    const url = window.prompt('ລິງກ໌ (https://…)');
    if (!url) return;
    const inserted = `[${selected}](${url})`;
    const next = value.slice(0, selectionStart) + inserted + value.slice(selectionEnd);
    onChange(next);
    requestAnimationFrame(() => {
      node.focus();
      const caret = selectionStart + inserted.length;
      node.setSelectionRange(caret, caret);
    });
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1">
        <ToolbarButton label="ໂຕໜາ" hint="ໂຕໜາ — ພິມ **ຂໍ້ຄວາມ**" onClick={() => wrap('**')}>
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="ໂຕອຽງ" hint="ໂຕອຽງ — ພິມ *ຂໍ້ຄວາມ*" onClick={() => wrap('*')}>
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="ລິງກ໌" hint="ລິງກ໌ — ພິມ [ຂໍ້ຄວາມ](ລິງກ໌)" onClick={link}>
          <LinkIcon className="size-3.5" />
        </ToolbarButton>
        {/* Always visible, not only on hover: the toolbar answers "how do I
            do this by clicking", but someone reading a paragraph already
            typed with **stars** in it needs the syntax explained without
            having to find and hover each button first. */}
        <span className="ml-1 text-[11px] text-ink-3">
          ຫຼືພິມເອງ: **ໂຕໜາ** · *ໂຕອຽງ* · [ຂໍ້ຄວາມ](ລິງກ໌)
        </span>
      </div>
      <Textarea ref={ref} value={value} onChange={(event) => onChange(event.target.value)} className={className} {...props} />
    </div>
  );
}

function ToolbarButton({
  label,
  hint,
  onClick,
  children,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={hint}
      aria-label={label}
      // Without this, the mousedown that precedes the click blurs the
      // textarea first — taking its selection with it, so wrap()/link()
      // would have nothing to wrap.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        'grid size-7 place-items-center rounded-[var(--radius-ui-sm)] border border-rule text-ink-3',
        'hover:border-ink-3 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
