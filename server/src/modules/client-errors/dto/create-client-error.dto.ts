import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateClientErrorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  stack?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  componentStack?: string;

  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  url!: string;

  @IsString()
  @MaxLength(1000)
  userAgent!: string;
}
