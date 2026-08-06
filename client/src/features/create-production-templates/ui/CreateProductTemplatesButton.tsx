import type { ButtonProps } from 'antd';
import type { FC } from 'react';

import type { ProductTemplate } from '@entities/product';
import { CreateEntityButton } from '@shared/ui/create-entity-button';

import { CreateForm } from './CreateForm';

type Props = ButtonProps & {
  onCreated?: (template: ProductTemplate) => void;
};

export const CreateProductTemplatesButton: FC<Props> = ({
  onCreated,
  ...props
}) => (
  <CreateEntityButton<ProductTemplate>
    title="Добавление новой номенклатуры"
    FormComponent={CreateForm}
    onCreated={onCreated}
    {...props}
  />
);
