import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateBy,
  ValidateIf,
} from 'class-validator';
import { OrderStatus } from '../../order-groups/entities/order-group.entity';

// Preserve JSON primitive types despite the application's implicit conversion.
export const RawValue = () =>
  Transform(({ obj, key }) => (obj as Record<string, unknown>)[key]);
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

export class UpdateDocumentManagementDto {
  @RawValue()
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER - 1)
  expectedVersion: number;

  @ValidateIf((_, value: unknown) => value !== undefined && value !== null)
  @ValidateBy({
    name: 'calendarDate',
    validator: {
      validate: (value: unknown) => {
        if (
          typeof value !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          value.startsWith('0000')
        )
          return false;
        const date = new Date(`${value}T00:00:00.000Z`);
        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === value
        );
      },
      defaultMessage: () => 'dueDate must be a valid YYYY-MM-DD calendar date',
    },
  })
  dueDate?: string | null;

  @ValidateIf((_, value: unknown) => value !== undefined && value !== null)
  @IsUUID()
  customStatusId?: string | null;
}

export class UpdateGroupManagementDto extends UpdateDocumentManagementDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @RawValue()
  @Trim()
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason?: string;

  @RawValue()
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsBoolean()
  confirmIncompleteProduction?: boolean;
}

export class CreateCustomStatusDto {
  @IsIn(['group', 'document'])
  scope: 'group' | 'document';

  @RawValue()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @RawValue()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color: string;

  @RawValue()
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(1000000)
  position?: number;
}

export class UpdateCustomStatusDto {
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

  @RawValue()
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(1000000)
  position?: number;
}

export class CustomStatusQueryDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsIn(['group', 'document'])
  scope?: 'group' | 'document';
}

export class UpdateManagementSettingsDto {
  @RawValue()
  @IsString()
  @MaxLength(100)
  @ValidateBy({
    name: 'timeZone',
    validator: {
      validate: (value: unknown) => {
        if (
          typeof value !== 'string' ||
          (value !== 'UTC' && !value.includes('/'))
        )
          return false;
        try {
          new Intl.DateTimeFormat('en', { timeZone: value });
          return true;
        } catch {
          return false;
        }
      },
      defaultMessage: () => 'timeZone must be a supported IANA time zone',
    },
  })
  timeZone: string;
}

export class ManagementHistoryQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  offset = 0;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @Type(() => Number)
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  orderGroupId?: number;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsUUID()
  orderId?: string;
}
