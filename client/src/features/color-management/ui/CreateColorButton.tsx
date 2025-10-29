import { type ButtonProps } from 'antd';
import { type FC } from 'react';

import type { Color } from '@entities/color';
import { CreateEntityButton } from '@shared/ui/create-entity-button';

import { CreateForm } from './CreateForm';

type Props = ButtonProps & {
  onCreated?: (color: Color) => void;
};

export const CreateColorButton: FC<Props> = ({ onCreated, ...props }) => {
  return (
    <CreateEntityButton<Color>
      title="Добавление нового красителя"
      FormComponent={CreateForm}
      onCreated={onCreated}
      {...props}
    />
  );
};
