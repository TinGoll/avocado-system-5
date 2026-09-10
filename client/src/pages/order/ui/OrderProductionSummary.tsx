import { css } from '@emotion/css';
import { Alert, Progress, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { FC } from 'react';
import { Link } from 'react-router';

import type { OrderProductionDocument } from '@shared/api';
import { DATE_DEFAULT_FORMAT } from '@shared/lib';

import { useOrderProduction } from '../api/useOrderProduction';

const styles = {
  container: css`
    margin-bottom: 12px;
    padding: 12px;
    border: 1px solid var(--app-devider-color);
    border-radius: 6px;
  `,
  progress: css`
    display: grid;
    grid-template-columns: minmax(180px, 360px) auto;
    align-items: center;
    gap: 8px 16px;
    margin-bottom: 12px;
  `,
};

const columns: ColumnsType<OrderProductionDocument> = [
  {
    title: 'Документ',
    render: (_, item) =>
      `№${item.documentNumber} · ${item.name?.trim() || `Документ ${item.documentNumber}`}`,
  },
  {
    title: 'Этап',
    render: (_, item) => item.stageName || 'Производство не настроено',
  },
  {
    title: 'Прогресс',
    width: 120,
    render: (_, item) => `${Number(item.progressPercent)}%`,
  },
  {
    title: 'Срок',
    width: 130,
    render: (_, item) =>
      item.effectiveDueDate
        ? dayjs(item.effectiveDueDate).format(DATE_DEFAULT_FORMAT)
        : 'Без срока',
  },
  {
    title: 'Доска',
    render: (_, item) =>
      item.boardId ? <Link to="/production">{item.boardName}</Link> : '—',
  },
];

type Props = { groupId: number };

export const OrderProductionSummary: FC<Props> = ({ groupId }) => {
  const { data, error, isLoading } = useOrderProduction(groupId);

  if (error) {
    return (
      <Alert showIcon type="error" title="Не удалось загрузить производство" />
    );
  }

  return (
    <section className={styles.container} aria-label="Производственная сводка">
      <Typography.Title level={5}>Производственная сводка</Typography.Title>
      {data && data.documentCount > 0 && (
        <div className={styles.progress}>
          <div>
            <Typography.Text>Прогресс по этапам</Typography.Text>
            <Progress percent={Math.round(data.progressPercent ?? 0)} />
          </div>
          <Typography.Text type="secondary">
            На доске: {data.trackedCount} из {data.documentCount}
          </Typography.Text>
        </div>
      )}
      <Table
        columns={columns}
        dataSource={data?.documents}
        loading={isLoading}
        locale={{ emptyText: 'В заказе пока нет документов' }}
        pagination={false}
        rowKey="id"
        size="small"
        scroll={{ x: 760 }}
      />
    </section>
  );
};
