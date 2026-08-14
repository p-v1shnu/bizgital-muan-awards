import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateEditionDto } from './create-edition.dto';

/**
 * Phase is not editable here — it moves only through PATCH /editions/:id/phase
 * so that every transition is checked and audited.
 */
export class UpdateEditionDto extends PartialType(OmitType(CreateEditionDto, ['phase'] as const)) {}
