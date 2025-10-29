import type { ButtonProps } from 'antd';
import type { FC } from 'react';

import type { FacadeProfile } from '@entities/facade-profile';
import { CreateEntityButton } from '@shared/ui/create-entity-button';

import { CreateForm } from './CreateForm';

type Props = ButtonProps & {
  onCreated?: (profile: FacadeProfile) => void;
};

export const CreateFacadeProfileButton: FC<Props> = ({
  onCreated,
  ...props
}) => {
  return (
    <CreateEntityButton<FacadeProfile>
      title="Добавление нового фасадного профиля"
      FormComponent={CreateForm}
      onCreated={onCreated}
      {...props}
    />
  );
};
