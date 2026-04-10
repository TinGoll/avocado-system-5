import type { ButtonProps } from 'antd';
import type { FC } from 'react';

import type { ProductTemplate } from '@entities/product';

type Props = ButtonProps & {
  onCreated?: (template: ProductTemplate) => void;
};

export const CreateProductTemplatesButton: FC<Props> = () => {
  return <div>CreateProductTemplatesButton</div>;
};
