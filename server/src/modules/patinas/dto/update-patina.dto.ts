import { PartialType } from '@nestjs/mapped-types';
import { CreatePatinaDto } from './create-patina.dto';

export class UpdatePatinaDto extends PartialType(CreatePatinaDto) {}
