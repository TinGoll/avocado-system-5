import { type ColProps, Col } from 'antd';
import type { ReactNode, FC } from 'react';

import { GridTitle, type GridTitleProps } from './GridTitle';

type Props = ColProps &
  GridTitleProps & {
    title?: ReactNode;
  };
export const GridCol: FC<Props> = ({
  required,
  tooltip,
  title,
  children,
  ...props
}) => {
  return (
    <Col {...props}>
      {title && (
        <GridTitle required={required} tooltip={tooltip}>
          {title}
        </GridTitle>
      )}
      {children}
    </Col>
  );
};
