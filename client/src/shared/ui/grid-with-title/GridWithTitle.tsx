import { Row, type RowProps } from 'antd';
import { type FC } from 'react';

import { GridCol } from './ui/GridCol';

interface Composition {
  Col: typeof GridCol;
}
type Props = RowProps;
export const GridWithTitle: FC<Props> & Composition = (props) => {
  return <Row {...props} />;
};

GridWithTitle.Col = GridCol;
