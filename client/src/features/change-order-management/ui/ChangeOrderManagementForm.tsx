import { css } from '@emotion/css';
import {
  Alert,
  App,
  Button,
  DatePicker,
  Form,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import type { AxiosError } from 'axios';
import dayjs, { type Dayjs } from 'dayjs';
import { type FC, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import type { ManagementScope, ManagementView } from '@entities/order';
import {
  getCustomStatuses,
  orderManagementKeys,
  updateManagement,
} from '@shared/api';
import { fetcher } from '@shared/lib/swr';

import { toManagementDate } from '../model/management-date';

const styles = {
  panel: css`
    padding: 10px;
    border: 1px solid var(--app-devider-color);
    border-radius: 6px;
    background: var(--app-surface-1-background-color);
  `,
  form: css`
    display: flex;
    align-items: flex-end;
    gap: 8px;
    flex-wrap: wrap;

    .ant-form-item {
      min-width: 210px;
      margin-bottom: 0;
    }
  `,
};

type Props = {
  scope: ManagementScope;
  targetId: number | string;
  groupId: number;
};
type Values = { dueDate: Dayjs | null; customStatusId: string | null };

export const ChangeOrderManagementForm: FC<Props> = ({
  scope,
  targetId,
  groupId,
}) => {
  const { message } = App.useApp();
  const { mutate: mutateGlobal } = useSWRConfig();
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
  const [form] = Form.useForm<Values>();

  useEffect(() => {
    if (!data) return;
    form.setFieldsValue({
      dueDate: data.dueDate ? dayjs(data.dueDate) : null,
      customStatusId: data.customStatusId,
    });
  }, [data, form]);

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
      mutateGlobal(orderManagementKeys.history(groupId)),
      scope === 'document' &&
        mutateGlobal(orderManagementKeys.documentView(String(targetId))),
      scope === 'document' &&
        mutateGlobal(orderManagementKeys.history(groupId, String(targetId))),
    ]);
  };

  const save = async (values: Values) => {
    try {
      await updateManagement(scope, targetId, {
        expectedVersion: data.managementVersion,
        dueDate: toManagementDate(values.dueDate),
        customStatusId: values.customStatusId ?? null,
      });
      await revalidateRelated();
      message.success('Срок и отметка сохранены');
    } catch (caught) {
      if ((caught as AxiosError).response?.status === 409) {
        await revalidateRelated();
        message.warning('Данные уже изменились. Показана актуальная версия.');
        return;
      }
      message.error('Не удалось сохранить срок и отметку');
    }
  };

  const options = (statuses.data?.items ?? []).map((status) => ({
    value: status.id,
    disabled: Boolean(status.archivedAt),
    label: (
      <Space size={4}>
        <Tag color={status.color}>{status.name}</Tag>
        {status.archivedAt && (
          <Typography.Text type="secondary">архив</Typography.Text>
        )}
      </Space>
    ),
  }));

  return (
    <div className={styles.panel}>
      <Form<Values>
        className={styles.form}
        form={form}
        initialValues={{
          dueDate: data.dueDate ? dayjs(data.dueDate, 'YYYY-MM-DD') : null,
          customStatusId: data.customStatusId,
        }}
        key={`${data.managementVersion}-${data.dueDate}-${data.customStatusId}`}
        onFinish={save}
      >
        <Form.Item
          label={scope === 'group' ? 'Срок заказа' : 'Срок документа'}
          name="dueDate"
        >
          <DatePicker
            allowClear
            format="DD.MM.YYYY"
            placeholder={
              scope === 'document' && !data.dueDate && data.effectiveDueDate
                ? `Срок заказа: ${dayjs(data.effectiveDueDate).format('DD.MM.YYYY')}`
                : 'Без срока'
            }
          />
        </Form.Item>
        <Form.Item label="Пользовательская отметка" name="customStatusId">
          <Select
            allowClear
            loading={statuses.isLoading}
            options={options}
            placeholder="Без отметки"
          />
        </Form.Item>
        {scope === 'document' && data.dueDate && (
          <Button
            onClick={() => {
              form.setFieldValue('dueDate', null);
              form.submit();
            }}
          >
            Снять свой срок
          </Button>
        )}
        <Button htmlType="submit" type="primary">
          Сохранить
        </Button>
      </Form>
      {statuses.error && (
        <Alert
          type="warning"
          showIcon
          title="Список отметок временно недоступен"
        />
      )}
    </div>
  );
};
