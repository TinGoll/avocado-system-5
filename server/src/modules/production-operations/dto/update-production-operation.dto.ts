import { PartialType } from '@nestjs/mapped-types';
import { CreateProductionOperationDto } from './create-production-operation.dto';

export class UpdateProductionOperationDto extends PartialType(
  CreateProductionOperationDto,
) {}
