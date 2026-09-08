import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

const RawValue = () =>
  Transform(({ obj, key }) => (obj as Record<string, unknown>)[key]);

export class CardsQueryDto {
  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  cursor?: string;

  @RawValue()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

export class AssignCardDto {
  @IsUUID()
  orderId: string;
  @RawValue() @IsInt() @Min(0) expectedBoardVersion: number;
  @RawValue() @IsInt() @Min(0) expectedGroupVersion: number;
}

export class MoveCardDto {
  @IsUUID()
  targetStageId: string;
  @IsOptional() @IsUUID() beforeCardId?: string | null;
  @RawValue() @IsInt() @Min(0) expectedCardVersion: number;
  @RawValue() @IsInt() @Min(0) expectedBoardVersion: number;
  @RawValue() @IsInt() @Min(0) expectedGroupVersion: number;
}

export class TransferCardDto extends MoveCardDto {
  @IsUUID()
  targetBoardId: string;
  @RawValue() @IsInt() @Min(0) expectedTargetBoardVersion: number;
}

export class RemoveCardDto {
  @RawValue() @IsInt() @Min(0) expectedCardVersion: number;
  @RawValue() @IsInt() @Min(0) expectedBoardVersion: number;
  @RawValue() @IsInt() @Min(0) expectedGroupVersion: number;
}
