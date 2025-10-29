import type { ButtonProps } from 'antd';
import type { FC } from 'react';

import type { Material } from '@entities/material';
import { CreateEntityButton } from '@shared/ui/create-entity-button';

import { CreateForm } from './CreateForm';

type Props = ButtonProps & {
  onCreated?: (material: Material) => void;
};

export const CreateMaterialButton: FC<Props> = ({ onCreated, ...props }) => {
  return (
    <CreateEntityButton<Material>
      title="Добавление нового материала"
      FormComponent={CreateForm}
      onCreated={onCreated}
      {...props}
    />
  );
};
