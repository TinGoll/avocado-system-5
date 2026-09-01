import {
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { css } from '@emotion/css';
import { App, Button, Input, Skeleton, Tabs } from 'antd';
import { type FC, type MouseEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

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
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    currentTabKey,
    initialization,
    removeTab,
    renameTab,
    setCurrentTabKey,
    tabs,
  } = orderTabsStore();

  useEffect(() => {
    if (!initialization || tabs.length === 0) return;

    const requestedDocumentNumber = Number(searchParams.get('document'));
    const requestedTab = tabs.find(
      ({ documentNumber }) => documentNumber === requestedDocumentNumber,
    );
    const activeTab =
      requestedTab ?? tabs.find(({ key }) => key === currentTabKey) ?? tabs[0];

    if (activeTab.key !== currentTabKey) {
      setCurrentTabKey(activeTab.key);
    }

    if (searchParams.get('document') !== String(activeTab.documentNumber)) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set('document', String(activeTab.documentNumber));
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [
    currentTabKey,
    initialization,
    searchParams,
    setCurrentTabKey,
    setSearchParams,
    tabs,
  ]);

  const selectTab = (key: string) => {
    const tab = tabs.find((item) => item.key === key);
    setCurrentTabKey(key);

    if (tab) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set('document', String(tab.documentNumber));
      setSearchParams(nextSearchParams);
    }
  };

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
          №{tab.documentNumber} · {tab.label}
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
    return <Skeleton.Input block active size="medium" />;
  }

  return (
    <Tabs
      className={styles.tabs}
      activeKey={currentTabKey}
      addIcon={isCreating ? <LoadingOutlined spin /> : undefined}
      onChange={selectTab}
      removeIcon={<DeleteOutlined />}
      type="editable-card"
      size="small"
      items={items}
      onEdit={onEdit}
    />
  );
};
