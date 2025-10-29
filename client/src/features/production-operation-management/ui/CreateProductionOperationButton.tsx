import type { ButtonProps } from 'antd';
import type { FC } from 'react';

import type { ProductionOperation } from '@entities/production-operation';
import { CreateEntityButton } from '@shared/ui/create-entity-button';

import { CreateForm } from './CreateForm';

type Props = ButtonProps & {
  onCreated?: (operation: ProductionOperation) => void;
};

export const CreateProductionOperationButton: FC<Props> = ({
  onCreated,
  ...props
}) => {
  return (
    <CreateEntityButton<ProductionOperation>
      title="Добавление новой работы."
      FormComponent={CreateForm}
      onCreated={onCreated}
      {...props}
    />
  );
};
