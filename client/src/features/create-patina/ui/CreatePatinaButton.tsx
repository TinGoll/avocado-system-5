import type { ButtonProps } from 'antd';
import type { FC } from 'react';

import type { Patina } from '@entities/patina';
import { CreateEntityButton } from '@shared/ui/create-entity-button';

import { CreateForm } from './CreateForm';

type Props = ButtonProps & {
  onCreated?: (patina: Patina) => void;
};

export const CreatePatinaButton: FC<Props> = ({ onCreated, ...props }) => {
  return (
    <CreateEntityButton<Patina>
      title="Добавление новой патины."
      FormComponent={CreateForm}
      onCreated={onCreated}
      {...props}
    />
  );
};
