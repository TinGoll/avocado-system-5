import type { FC } from 'react';

import { CreateOrderButton } from '@features/create-order';

export const HomePage: FC = () => {
  return (
    <div>
      <CreateOrderButton>Создать заказ</CreateOrderButton>
    </div>
  );
};
