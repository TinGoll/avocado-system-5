import type { ButtonProps } from 'antd';
import type { FC } from 'react';

import type { OrderGroup } from '@entities/order';
import { CreateEntityButton } from '@shared/ui/create-entity-button';

import { CreateOrderForm } from './CreateOrderForm';

type Props = ButtonProps & {
  onCreated?: (group: OrderGroup) => void;
};

export const CreateOrderButton: FC<Props> = ({ onCreated, ...props }) => {
  return (
    <CreateEntityButton<OrderGroup>
      title="Создание нового заказа"
      FormComponent={CreateOrderForm}
      onCreated={onCreated}
      {...props}
    />
  );
};
