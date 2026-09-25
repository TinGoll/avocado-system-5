import { Equals } from 'class-validator';

export const DATABASE_RESET_CONFIRMATION = 'УДАЛИТЬ ВСЕ ДАННЫЕ';

export class ResetDatabaseDto {
  @Equals(DATABASE_RESET_CONFIRMATION, {
    message: 'Введите точную фразу подтверждения',
  })
  confirmation!: string;
}
