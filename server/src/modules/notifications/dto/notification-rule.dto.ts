import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from '../../order-groups/entities/order-group.entity';
import type {
  NotificationRepeat,
  NotificationScope,
  NotificationSeverity,
  NotificationTrigger,
} from '../entities/notification-rule.entity';

const RawValue = () =>
  Transform(({ obj, key }) => (obj as Record<string, unknown>)[key]);
const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

class NotificationConditionsDto {
  @RawValue()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  days?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsEnum(OrderStatus, { each: true })
  systemStatusIn?: OrderStatus[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  customStatusIn?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  customStatusNotIn?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  boardIn?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  stageIn?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  fromStageIn?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  toStageIn?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  fromCustomStatusIn?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  toCustomStatusIn?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsEnum(OrderStatus, { each: true })
  fromSystemStatusIn?: OrderStatus[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsEnum(OrderStatus, { each: true })
  toSystemStatusIn?: OrderStatus[];
}

export class CreateNotificationRuleDto {
  @RawValue()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @RawValue()
  @IsBoolean()
  enabled: boolean;

  @IsIn(['group', 'document'])
  scope: NotificationScope;

  @IsIn([
    'due_soon',
    'overdue',
    'stage_stalled',
    'stage_changed',
    'custom_status_changed',
    'lifecycle_changed',
  ])
  trigger: NotificationTrigger;

  @Type(() => NotificationConditionsDto)
  @ValidateNested()
  conditions: NotificationConditionsDto;

  @IsIn(['once', 'daily'])
  repeat: NotificationRepeat;

  @RawValue()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  messageTemplate: string;

  @IsIn(['info', 'warning', 'error'])
  severity: NotificationSeverity;
}

export class UpdateNotificationRuleDto extends CreateNotificationRuleDto {
  @RawValue()
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER - 1)
  expectedRevision: number;
}

export class PreviewNotificationRuleDto extends CreateNotificationRuleDto {
  @RawValue()
  @IsOptional()
  @IsInt()
  @Min(1)
  orderGroupId?: number;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @RawValue()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
