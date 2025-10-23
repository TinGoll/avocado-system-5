import { IsInt, IsObject, IsPositive, IsUUID } from 'class-validator';

export class CreateOrderItemDto {
  @IsUUID('4')
  templateId: string; // ID шаблона продукта

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsObject()
  characteristics: Record<string, string | number | boolean>;
}
