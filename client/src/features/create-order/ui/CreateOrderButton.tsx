import type { ButtonProps } from 'antd';
import { lazy, Suspense, type ComponentProps, type FC } from 'react';
import { useNavigate } from 'react-router';

import type { OrderGroup } from '@entities/order';
import { CreateEntityButton } from '@shared/ui/create-entity-button';

const CreateOrderForm = lazy(() =>
  import('./CreateOrderForm').then(({ CreateOrderForm }) => ({
    default: CreateOrderForm,
  })),
);

const LazyCreateOrderForm: FC<ComponentProps<typeof CreateOrderForm>> = (
  props,
) => (
  <Suspense
    fallback={
      <div aria-live="polite" role="status">
        Загрузка формы…
      </div>
    }
  >
    <CreateOrderForm {...props} />
  </Suspense>
);

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
      FormComponent={LazyCreateOrderForm}
      onCreated={handleCreate}
      {...props}
    />
  );
};
