import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { css } from '@emotion/css';
import { Button, Divider } from 'antd';
import { type FC } from 'react';

const styles = {
  toolbar: css`
    background-color: var(--app-body-2-background-color);
    border-left: 1px solid var(--app-devider-color);
    border-right: 1px solid var(--app-devider-color);
  `,
  inner: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px;
  `,
  actions: css`
    display: flex;
    gap: 8px;
  `,
  divider: css`
    margin: 0;
  `,
};

type Props = {
  onChangeName?: () => void;
  onAddFields?: () => void;
  onDeleteOrder?: () => void;
  onCopyOrder?: () => void;
};

export const Toolbar: FC<Props> = ({
  onChangeName,
  onAddFields,
  onDeleteOrder,
  onCopyOrder,
}) => {
  return (
    <div className={styles.toolbar}>
      <div className={styles.inner}>
        <Button
          size="small"
          type="text"
          icon={<EditOutlined />}
          onClick={onChangeName}
        >
          Переименовать вкладку...
        </Button>
        <div className={styles.actions}>
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={onAddFields}
          />
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            onClick={onDeleteOrder}
          />
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={onCopyOrder}
          />
        </div>
      </div>
      <Divider className={styles.divider} />
    </div>
  );
};
