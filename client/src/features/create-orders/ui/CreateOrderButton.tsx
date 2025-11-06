import type { ButtonProps } from 'antd';
import type { FC } from 'react';
import { useNavigate } from 'react-router';

import type { OrderGroup } from '@entities/order';
import { CreateEntityButton } from '@shared/ui/create-entity-button';

import { CreateOrderForm } from './CreateOrderForm';

type Props = ButtonProps & {
  onCreated?: (group: OrderGroup) => void;
};

export const CreateOrderButton: FC<Props> = ({ onCreated, ...props }) => {
  const navigate = useNavigate();

  const handleCreate = (group: OrderGroup): void => {
    onCreated?.(group);
    navigate(`/order/${group.id}/editing`);
  };

  return (
    <CreateEntityButton<OrderGroup>
      title="Создание нового заказа"
      FormComponent={CreateOrderForm}
      onCreated={handleCreate}
      {...props}
    />
  );
};
