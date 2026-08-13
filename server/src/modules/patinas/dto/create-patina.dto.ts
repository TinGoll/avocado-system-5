import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePatinaDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
