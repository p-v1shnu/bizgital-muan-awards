import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { verify } from 'jsonwebtoken';
import type { Request } from 'express';

/**
 * The rate limit exists to keep strangers from hammering the public side. It
 * was also counting the back office, where a hundred requests a minute is not
 * a lot: one click in the nominee tab fires the write plus two list refreshes,
 * and the team enters hundreds of rows during a backfill (PRD §7.5) — they
 * would have been throttled doing exactly the work the tool is for.
 *
 * So signed-in work is skipped. What decides "signed in" is the point: it used
 * to be the path, and this guard runs *before* the one that checks tokens — so
 * anyone at all could hold `/api/v1/admin/…` open with no ceiling and collect
 * 401s as fast as the server could produce them. The address of the request
 * makes no difference to that; a bad token does.
 *
 * Only the signature is checked here, not the session behind it. That is
 * deliberate: it costs no database round trip, it cannot be forged without the
 * secret, and the guard immediately after this one does the rest. The question
 * being asked is "is this plausibly the team", not "is this person allowed".
 */
@Injectable()
export class PublicThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.path.startsWith('/api/v1/admin/')) return false;

    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return false;

    try {
      verify(header.slice(7), process.env.JWT_SECRET as string);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * The person who runs into this is usually not the person it was built for.
   * Mobile networks in Laos put a great many subscribers behind one public
   * address, so the limit is shared by strangers: measured against a single
   * address, the eleventh entry was refused and the sender was shown
   * "ThrottlerException: Too Many Requests" — in English, naming a class.
   */
  protected async getErrorMessage(): Promise<string> {
    return 'ສົ່ງເລື້ອຍເກີນໄປ — ອິນເຕີເນັດມືຖືມັກໃຊ້ທີ່ຢູ່ຮ່ວມກັນຫຼາຍຄົນ ກະລຸນາລໍຖ້າແລ້ວລອງໃໝ່ ຫຼື ປ່ຽນເປັນ Wi-Fi';
  }
}
