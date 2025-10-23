import { PartialType } from '@nestjs/mapped-types';
import { CreatePriceModifierDto } from './create-price-modifier.dto';

export class UpdatePriceModifierDto extends PartialType(
  CreatePriceModifierDto,
) {}
