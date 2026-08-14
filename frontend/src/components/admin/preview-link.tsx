'use client';

import { useState } from 'react';
import { ArrowRight, Copy, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorNote, Note } from '@/components/ui/feedback';
import { Input } from '@/components/ui/field';
import { useApiMutation } from '@/lib/api/hooks';
import { formatDateTime } from '@/lib/dates';

interface Minted {
  token: string;
  expiresAt: string;
  slug: string;
}

/**
 * Opens an unpublished year (PRD §4.3.2). A signed-in admin can just follow
 * the link; the token is what lets them send it to someone who cannot log in.
 */
export function PreviewLink({ editionId, slug }: { editionId: string; slug: string }) {
  const [open, setOpen] = useState(false);
  const [minted, setMinted] = useState<Minted | null>(null);
  const [copied, setCopied] = useState(false);

  const mint = useApiMutation<Record<string, never>, Minted>(
    `/admin/editions/${editionId}/preview-token`,
    'POST',
  );

  const url = minted
    ? `${window.location.origin}/awards/${minted.slug}?preview=${minted.token}`
    : '';

  return (
    <>
      <Button
        size="sm"
        className="border-[#5c5149] bg-transparent text-[#f0e9df] hover:bg-[#332b26] hover:text-white"
        onClick={() => {
          setOpen(true);
          setCopied(false);
          if (!minted) mint.mutate({} as Record<string, never>, { onSuccess: setMinted });
        }}
      >
        ລິງກ໌ພຣີວິວ <ArrowRight className="size-3.5" />
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        width="lg"
        title="ລິງກ໌ພຣີວິວ"
        description="ເປີດໜ້າປີນີ້ໄດ້ທັງທີ່ຍັງບໍ່ໄດ້ເຜີຍແຜ່ · ໃຊ້ໄດ້ 7 ວັນ"
        footer={
          <>
            <Button type="button" onClick={() => setOpen(false)}>
              ປິດ
            </Button>
            {url && (
              <Button
                type="button"
                variant="primary"
                onClick={() => window.open(url, '_blank', 'noopener')}
              >
                ເປີດເລີຍ <ArrowRight className="size-3.5" />
              </Button>
            )}
          </>
        }
      >
        {mint.error && <ErrorNote error={mint.error} />}
        {mint.isPending && <p className="text-[13px] text-ink-3">ກຳລັງສ້າງລິງກ໌…</p>}

        {minted && (
          <>
            <div className="mb-3 flex gap-2">
              <Input readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
              <Button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(url).then(() => setCopied(true));
                }}
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? 'ສຳເນົາແລ້ວ' : 'ສຳເນົາ'}
              </Button>
            </div>

            <Note>
              ໝົດອາຍຸ {formatDateTime(minted.expiresAt)} ·
              ລິງກ໌ນີ້ເປີດໄດ້<b className="text-ink-2">ສະເພາະປີນີ້</b>ປີດຽວ ·
              ໃຜມີລິງກ໌ກໍເປີດໄດ້ ຢ່າໂພສສາທາລະນະ
            </Note>
          </>
        )}
      </Dialog>
    </>
  );
}
