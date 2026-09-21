import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { ProductionStageKind } from '../entities/production-stage.entity';

const RawValue = () =>
  Transform(({ obj, key }) => (obj as Record<string, unknown>)[key]);
const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

export class BoardVersionDto {
  @RawValue()
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER - 1)
  expectedVersion: number;
}

export class StageDefinitionDto {
  @RawValue()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @RawValue()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color: string;

  @IsIn(['queue', 'active', 'done'])
  kind: ProductionStageKind;

  @RawValue()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent: number;
}

export class CreateBoardDto {
  @RawValue()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ValidateIf((_, value: unknown) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(100)
  @Type(() => StageDefinitionDto)
  @ValidateNested({ each: true })
  stages: StageDefinitionDto[];

  @RawValue()
  @IsInt()
  @Min(0)
  @Max(99)
  initialStageIndex: number;
}

export class UpdateBoardDto extends BoardVersionDto {
  @RawValue()
  @Trim()
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ValidateIf((_, value: unknown) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsUUID()
  initialStageId?: string;
}

export class CreateStageDto extends StageDefinitionDto {
  @RawValue()
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER - 1)
  expectedVersion: number;
}

export class UpdateStageDto extends BoardVersionDto {
  @RawValue()
  @Trim()
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @RawValue()
  @ValidateIf((_, value: unknown) => value !== undefined)
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsIn(['queue', 'active', 'done'])
  kind?: ProductionStageKind;

  @RawValue()
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;
}

export class RemoveStageDto extends BoardVersionDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsUUID()
  initialStageId?: string;
}

export class ReorderStagesDto extends BoardVersionDto {
  @IsArray()
  @ArrayMinSize(3)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  stageIds: string[];
}
