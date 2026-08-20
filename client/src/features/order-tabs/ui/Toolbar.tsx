import {
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  PlusOutlined,
  UpOutlined,
} from '@ant-design/icons';
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
    justify-content: space-between;
    gap: 12px;
    padding: 6px;
  `,
  summary: css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  actions: css`
    display: flex;
    gap: 8px;
    margin-left: auto;
  `,
  divider: css`
    margin: 0;
  `,
};

type Props = {
  summary?: ReactNode;
  addFieldsAction?: ReactNode;
  recalculatePricesAction?: ReactNode;
  isCopyingOrder?: boolean;
  isFieldsCollapsed?: boolean;
  onAddFields?: () => void;
  onDeleteOrder?: () => void;
  onCopyOrder?: () => void;
  onToggleFields?: () => void;
};

export const Toolbar: FC<Props> = ({
  summary,
  addFieldsAction,
  recalculatePricesAction,
  isCopyingOrder,
  isFieldsCollapsed,
  onAddFields,
  onDeleteOrder,
  onCopyOrder,
  onToggleFields,
}) => {
  return (
    <div className={styles.toolbar}>
      <div className={styles.inner}>
        {summary && <div className={styles.summary}>{summary}</div>}
        <div className={styles.actions}>
          {recalculatePricesAction}
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
          <Button
            aria-expanded={!isFieldsCollapsed}
            aria-label={
              isFieldsCollapsed
                ? 'Развернуть шапку документа'
                : 'Свернуть шапку документа'
            }
            type="text"
            size="small"
            icon={isFieldsCollapsed ? <DownOutlined /> : <UpOutlined />}
            onClick={onToggleFields}
          />
        </div>
      </div>
      <Divider className={styles.divider} />
    </div>
  );
};
