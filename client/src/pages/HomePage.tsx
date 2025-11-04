import type { FC } from 'react';

import { CreateOrderButton } from '@features/create-orders';

export const HomePage: FC = () => {
  return (
    <div>
      <div>
        <CreateOrderButton>Создать заказ</CreateOrderButton>
      </div>
    </div>
  );
};
