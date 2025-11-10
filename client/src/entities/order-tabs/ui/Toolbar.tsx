import { CopyOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { Button, Divider } from 'antd';
import type { FC } from 'react';

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

export const Toolbar: FC = () => {
  return (
    <div className={styles.toolbar}>
      <div className={styles.inner}>
        <Button size="small" type="text" icon={<EditOutlined />}>
          Переименовать вкладку...
        </Button>
        <div className={styles.actions}>
          <Button type="text" size="small" icon={<DeleteOutlined />} />
          <Button type="text" size="small" icon={<CopyOutlined />} />
        </div>
      </div>
      <Divider className={styles.divider} />
    </div>
  );
};
