import { Alert, List, Tag, Typography } from 'antd';
import type { FC } from 'react';
import { Link, useSearchParams } from 'react-router';
import useSWR from 'swr';

import { orderStatusLabels, type OrderGroup } from '@entities/order';
import { Endpoints, fetcher } from '@shared/lib/swr';

type SearchResponse = {
  items: OrderGroup[];
};

const getOrderPath = (group: OrderGroup): string =>
  group.status === 'draft'
    ? `/order/${group.id}/editing`
    : `/order/${group.id}`;

export const OrderSearchPage: FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim() ?? '';
  const { data, error, isLoading } = useSWR<SearchResponse>(
    query.length >= 2
      ? `${Endpoints.ORDER_GROUPS}/search?q=${encodeURIComponent(query)}`
      : null,
    (url: string) => fetcher<SearchResponse>({ url }),
  );
  const groups = data?.items ?? [];

  return (
    <section css={{ padding: 24 }}>
      <Typography.Title level={4}>Результаты поиска</Typography.Title>
      <Typography.Paragraph type="secondary">
        Запрос: «{query}»
      </Typography.Paragraph>
      {error ? (
        <Alert showIcon type="error" title="Не удалось выполнить поиск" />
      ) : (
        <List
          bordered
          loading={isLoading}
          dataSource={groups}
          locale={{
            emptyText:
              query.length < 2
                ? 'Введите минимум 2 символа'
                : 'Заказы не найдены',
          }}
          renderItem={(group) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Link to={getOrderPath(group)}>
                    Заказ № {group.orderNumber}
                  </Link>
                }
                description={`${group.customer?.name || 'Заказчик не указан'} · документов: ${group.orders?.length ?? 0}`}
              />
              <Tag>{orderStatusLabels[group.status]}</Tag>
            </List.Item>
          )}
        />
      )}
    </section>
  );
};
