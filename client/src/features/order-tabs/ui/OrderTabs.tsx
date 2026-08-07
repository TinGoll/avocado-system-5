import {
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { css } from '@emotion/css';
import { App, Button, Input, Skeleton, Tabs } from 'antd';
import { type FC, type MouseEvent, useState } from 'react';

import { useOrdersMutations } from '@entities/order';
import { useCurrentOrderGroupID } from '@shared/lib';

import { useLoadTabs } from '../hooks/useLoadTabs';
import { orderTabsStore } from '../model/orderTabs.store';

const styles = {
  tabs: css`
    & .ant-tabs-tab-btn {
      user-select: none;
    }
  `,
  tabLabel: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
  `,
  editButton: css`
    padding: 0 2px;
  `,
  input: css`
    width: 140px;
  `,
};

type Props = {
  isCreating?: boolean;
  onCreate?: () => void;
  onDelete?: (key: string) => void;
};

export const OrderTabs: FC<Props> = ({ isCreating, onCreate, onDelete }) => {
  const { message, modal } = App.useApp();
  const { groupID } = useCurrentOrderGroupID();
  const { isLoading } = useLoadTabs(groupID);
  const { remove, update } = useOrdersMutations();
  const [editingKey, setEditingKey] = useState<string>();
  const [editingName, setEditingName] = useState('');

  const { currentTabKey, removeTab, renameTab, setCurrentTabKey, tabs } =
    orderTabsStore();

  const beginEditing = (event: MouseEvent, key: string, name: string) => {
    event.preventDefault();
    event.stopPropagation();
    setEditingKey(key);
    setEditingName(name);
  };

  const stopTabsEvent = (event: MouseEvent) => {
    event.stopPropagation();
  };

  const cancelEditing = () => {
    setEditingKey(undefined);
    setEditingName('');
  };

  const saveName = async (key: string) => {
    const name = editingName.trim();
    const currentName = tabs.find((tab) => tab.key === key)?.label;

    if (!name) {
      message.warning('Название вкладки не может быть пустым');
      return;
    }

    if (name === currentName) {
      cancelEditing();
      return;
    }

    try {
      await update.trigger(key, { name });
      renameTab(key, name);
      cancelEditing();
    } catch {
      message.error('Не удалось переименовать вкладку');
    }
  };

  const deleteDocument = (key: string) => {
    const documentName = tabs.find((tab) => tab.key === key)?.label;

    modal.confirm({
      title: 'Удалить документ?',
      content: documentName,
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await remove.trigger(key);
          removeTab(key);
          onDelete?.(key);
          message.success('Документ удалён');
        } catch (error) {
          message.error('Не удалось удалить документ');
          throw error;
        }
      },
    });
  };

  const items = tabs.map((tab) => ({
    ...tab,
    label:
      editingKey === tab.key ? (
        <Input
          autoFocus
          className={styles.input}
          disabled={update.isMutating}
          maxLength={100}
          size="small"
          suffix={<CheckOutlined />}
          value={editingName}
          onBlur={() => void saveName(tab.key)}
          onChange={(event) => setEditingName(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={stopTabsEvent}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Enter') void saveName(tab.key);
            if (event.key === 'Escape') cancelEditing();
          }}
        />
      ) : (
        <span className={styles.tabLabel}>
          {tab.label}
          {currentTabKey === tab.key && (
            <Button
              aria-label="Переименовать вкладку"
              className={styles.editButton}
              icon={<EditOutlined />}
              size="small"
              type="text"
              onMouseDown={(event) => beginEditing(event, tab.key, tab.label)}
            />
          )}
        </span>
      ),
  }));
  const onEdit = (
    targetKey: React.MouseEvent | React.KeyboardEvent | string,
    action: 'add' | 'remove',
  ) => {
    if (action === 'add') {
      onCreate?.();
    } else {
      deleteDocument(String(targetKey));
    }
  };

  if (isLoading) {
    return <Skeleton.Input block active size="default" />;
  }

  return (
    <Tabs
      className={styles.tabs}
      activeKey={currentTabKey}
      addIcon={isCreating ? <LoadingOutlined spin /> : undefined}
      onChange={setCurrentTabKey}
      removeIcon={<DeleteOutlined />}
      type="editable-card"
      size="small"
      items={items}
      onEdit={onEdit}
    />
  );
};
