import { type ButtonProps } from 'antd';
import { type FC } from 'react';

import type { FacadePanel } from '@entities/facade-panel';
import { CreateEntityButton } from '@shared/ui/create-entity-button';

import { CreateForm } from './CreateForm';

type Props = ButtonProps & {
  onCreated?: (panel: FacadePanel) => void;
};

export const CreateFacadePanelButton: FC<Props> = ({ onCreated, ...props }) => {
  return (
    <CreateEntityButton<FacadePanel>
      title="Добавление новой филёнки"
      FormComponent={CreateForm}
      onCreated={onCreated}
      {...props}
    />
  );
};
