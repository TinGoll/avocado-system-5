import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class CreatePanelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsObject()
  characteristics: Record<string, string | number | boolean>;
}
