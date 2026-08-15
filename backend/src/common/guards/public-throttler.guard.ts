import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * The rate limit exists to keep strangers from hammering the public side. It
 * was also counting the back office, where a hundred requests a minute is not
 * a lot: one click in the nominee tab fires the write plus two list refreshes,
 * and the team enters hundreds of rows during a backfill (PRD §7.5) — they
 * would have been throttled doing exactly the work the tool is for.
 *
 * Signed-in routes are bounded by the person clicking and by the JWT guard in
 * front of them, so they are skipped here. `/admin/auth`-style entry points
 * are not under this prefix and stay limited, and the public submission form
 * keeps its own much stricter limit.
 */
@Injectable()
export class PublicThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    return request.path.startsWith('/api/v1/admin/');
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
