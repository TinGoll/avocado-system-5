import { css } from '@emotion/css';
import {
  Alert,
  App,
  DatePicker,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import type { AxiosError } from 'axios';
import dayjs, { type Dayjs } from 'dayjs';
import { type FC, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import type { ManagementScope, ManagementView } from '@entities/order';
import {
  getCustomStatuses,
  orderManagementKeys,
  updateManagement,
} from '@shared/api';
import { fetcher } from '@shared/lib/swr';
import { Editable } from '@shared/ui';

import { toManagementDate } from '../model/management-date';

const styles = {
  fields: css`
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
  `,
  field: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
  `,
  label: css`
    white-space: nowrap;
  `,
  value: css`
    min-width: 110px;
  `,
  datePicker: css`
    width: 160px;
  `,
  statusSelect: css`
    min-width: 160px;
  `,
  alert: css`
    margin-top: 8px;
  `,
};

type Props = {
  scope: ManagementScope;
  targetId: number | string;
  groupId: number;
  onSaved?: () => void | Promise<void>;
};

export const ChangeOrderManagementForm: FC<Props> = ({
  scope,
  targetId,
  groupId,
  onSaved,
}) => {
  const { message } = App.useApp();
  const { mutate: mutateGlobal } = useSWRConfig();
  const [savingField, setSavingField] = useState<'dueDate' | 'status' | null>(
    null,
  );
  const key =
    scope === 'group'
      ? orderManagementKeys.group(Number(targetId))
      : orderManagementKeys.document(String(targetId));
  const { data, error, isLoading, mutate } = useSWR<ManagementView>(
    key,
    (url: string) => fetcher<ManagementView>({ url }),
  );
  const statuses = useSWR(orderManagementKeys.statuses(scope), () =>
    getCustomStatuses(scope),
  );

  if (isLoading || !data) {
    return error ? (
      <Alert
        type="error"
        showIcon
        title="Не удалось загрузить срок и отметку"
      />
    ) : (
      <Skeleton.Input active block />
    );
  }

  const revalidateRelated = async () => {
    await Promise.all([
      mutate(),
      mutateGlobal(orderManagementKeys.group(groupId)),
      mutateGlobal(orderManagementKeys.groupView(groupId)),
      mutateGlobal(orderManagementKeys.production(groupId)),
      mutateGlobal(orderManagementKeys.history(groupId)),
      scope === 'document' &&
        mutateGlobal(orderManagementKeys.documentView(String(targetId))),
      scope === 'document' &&
        mutateGlobal(orderManagementKeys.history(groupId, String(targetId))),
    ]);
  };

  const save = async (
    field: 'dueDate' | 'status',
    update: { dueDate: string | null } | { customStatusId: string | null },
  ) => {
    setSavingField(field);
    try {
      await updateManagement(scope, targetId, {
        expectedVersion: data.managementVersion,
        ...update,
      });
      await revalidateRelated();
      await onSaved?.();
      message.success(
        field === 'dueDate' ? 'Срок сохранён' : 'Отметка сохранена',
      );
    } catch (caught) {
      if ((caught as AxiosError).response?.status === 409) {
        await revalidateRelated();
        message.warning('Данные уже изменились. Показана актуальная версия.');
        return;
      }
      message.error(
        field === 'dueDate'
          ? 'Не удалось сохранить срок'
          : 'Не удалось сохранить отметку',
      );
    } finally {
      setSavingField(null);
    }
  };

  const options = (statuses.data?.items ?? []).map((status) => ({
    value: status.id,
    disabled: Boolean(status.archivedAt),
    label: (
      <Space size={4}>
        <Tag color={status.color} variant="solid">
          {status.name}
        </Tag>
        {status.archivedAt && (
          <Typography.Text type="secondary">архив</Typography.Text>
        )}
      </Space>
    ),
  }));
  const dueDateText = data.dueDate
    ? dayjs(data.dueDate).format('DD.MM.YYYY')
    : scope === 'document' && data.effectiveDueDate
      ? `Срок заказа: ${dayjs(data.effectiveDueDate).format('DD.MM.YYYY')}`
      : 'Без срока';

  return (
    <div>
      <div className={styles.fields}>
        <div className={styles.field}>
          <Typography.Text className={styles.label}>
            {scope === 'group' ? 'Срок заказа:' : 'Срок документа:'}
          </Typography.Text>
          <Editable<Dayjs | null>
            className={styles.value}
            control={(props) => (
              <DatePicker
                {...props}
                allowClear
                autoFocus
                className={styles.datePicker}
                format="DD.MM.YYYY"
                placeholder="Без срока"
                size="small"
              />
            )}
            defaultValue={data.dueDate ? dayjs(data.dueDate) : null}
            key={`due-date-${data.managementVersion}`}
            loading={savingField === 'dueDate'}
            name={`${scope}-${targetId}-due-date`}
            onSave={(_, value) =>
              void save('dueDate', { dueDate: toManagementDate(value ?? null) })
            }
          >
            <Typography.Text type={data.dueDate ? undefined : 'secondary'}>
              {dueDateText}
            </Typography.Text>
          </Editable>
        </div>

        <div className={styles.field}>
          <Typography.Text className={styles.label}>
            Пользовательская отметка:
          </Typography.Text>
          <Editable<string | null>
            className={styles.value}
            control={(props) => (
              <Select
                {...props}
                allowClear
                autoFocus
                className={styles.statusSelect}
                loading={statuses.isLoading}
                options={options}
                placeholder="Без отметки"
                size="small"
              />
            )}
            defaultValue={data.customStatusId}
            key={`status-${data.managementVersion}`}
            loading={savingField === 'status'}
            name={`${scope}-${targetId}-status`}
            onSave={(_, value) =>
              void save('status', { customStatusId: value ?? null })
            }
          >
            {data.customStatus ? (
              <Tag color={data.customStatus.color} variant="solid">
                {data.customStatus.name}
              </Tag>
            ) : (
              <Typography.Text type="secondary">Без отметки</Typography.Text>
            )}
          </Editable>
        </div>
      </div>

      {statuses.error && (
        <Alert
          className={styles.alert}
          type="warning"
          showIcon
          title="Список отметок временно недоступен"
        />
      )}
    </div>
  );
};
