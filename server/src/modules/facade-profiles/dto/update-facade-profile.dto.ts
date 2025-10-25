import { PartialType } from '@nestjs/mapped-types';
import { CreateFacadeProfileDto } from './create-facade-profile.dto';

export class UpdateFacadeProfileDto extends PartialType(
  CreateFacadeProfileDto,
) {}
