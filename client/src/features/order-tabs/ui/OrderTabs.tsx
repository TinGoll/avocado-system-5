import { DeleteOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { Skeleton, Tabs } from 'antd';
import type { FC } from 'react';

import { useCurrentOrderGroupID } from '@shared/hooks/useCurrentOrderGroupID';

import { useLoadTabs } from '../hooks/useLoadTabs';
import { orderTabsStore } from '../model/orderTabs.store';

const styles = {
  tabs: css`
    & .ant-tabs-tab-btn {
      user-select: none;
    }
  `,
};

type Props = {
  onCreate?: () => void;
  onDelete?: (key: string) => void;
};

export const OrderTabs: FC<Props> = ({ onCreate, onDelete }) => {
  const { groupID } = useCurrentOrderGroupID();
  const { isLoading } = useLoadTabs(groupID);

  const { currentTabKey, setCurrentTabKey, tabs } = orderTabsStore();
  const onEdit = (
    targetKey: React.MouseEvent | React.KeyboardEvent | string,
    action: 'add' | 'remove',
  ) => {
    if (action === 'add') {
      onCreate?.();
    } else {
      onDelete?.(String(targetKey));
    }
  };

  if (isLoading) {
    return <Skeleton.Input block active size="default" />;
  }

  return (
    <Tabs
      className={styles.tabs}
      activeKey={currentTabKey}
      onChange={setCurrentTabKey}
      removeIcon={<DeleteOutlined />}
      type="editable-card"
      size="small"
      items={tabs}
      onEdit={onEdit}
    />
  );
};
