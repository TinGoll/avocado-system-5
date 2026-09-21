import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class NotificationFeedQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

export class ReadNotificationDto {
  @Transform(({ obj, key }) => (obj as Record<string, unknown>)[key])
  @IsBoolean()
  read: boolean;
}
