import { IsNotEmpty, IsString } from 'class-validator';

export class CreateVarnishDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
