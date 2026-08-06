import { CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { Button, Divider } from 'antd';
import { type FC, type ReactNode } from 'react';

const styles = {
  toolbar: css`
    background-color: var(--app-body-2-background-color);
    border-left: 1px solid var(--app-devider-color);
    border-right: 1px solid var(--app-devider-color);
  `,
  inner: css`
    display: flex;
    align-items: center;
    justify-content: flex-end;
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
  addFieldsAction?: ReactNode;
  isCopyingOrder?: boolean;
  onAddFields?: () => void;
  onDeleteOrder?: () => void;
  onCopyOrder?: () => void;
};

export const Toolbar: FC<Props> = ({
  addFieldsAction,
  isCopyingOrder,
  onAddFields,
  onDeleteOrder,
  onCopyOrder,
}) => {
  return (
    <div className={styles.toolbar}>
      <div className={styles.inner}>
        <div className={styles.actions}>
          {addFieldsAction ?? (
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={onAddFields}
            />
          )}
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            onClick={onDeleteOrder}
          />
          <Button
            aria-label="Копировать документ"
            disabled={!onCopyOrder}
            type="text"
            size="small"
            icon={<CopyOutlined />}
            loading={isCopyingOrder}
            onClick={onCopyOrder}
          />
        </div>
      </div>
      <Divider className={styles.divider} />
    </div>
  );
};
