import type { ButtonProps } from 'antd';
import type { FC } from 'react';

import type { Varnish } from '@entities/varnish';
import { CreateEntityButton } from '@shared/ui/create-entity-button';

import { CreateForm } from './CreateForm';

type Props = ButtonProps & {
  onCreated?: (varnish: Varnish) => void;
};

export const CreateVarnishButton: FC<Props> = ({ onCreated, ...props }) => {
  return (
    <CreateEntityButton<Varnish>
      title="Добавление нового лака."
      FormComponent={CreateForm}
      onCreated={onCreated}
      {...props}
    />
  );
};
