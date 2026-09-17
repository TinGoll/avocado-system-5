import { CheckOutlined, SettingOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { Alert, Empty, Progress, Skeleton, Typography } from 'antd';
import dayjs from 'dayjs';
import { type FC, useMemo } from 'react';
import { Link } from 'react-router';
import useSWR from 'swr';

import {
  getProductionBoard,
  type OrderProductionDocument,
  type ProductionBoard,
} from '@shared/api';
import { DATE_DEFAULT_FORMAT } from '@shared/lib';

import { useOrderProduction } from '../api/useOrderProduction';
const styles = {
  container: css`
    margin-bottom: 12px;
    padding: 18px 20px 20px;
    border: 1px solid #303a46;
    border-radius: 8px;
    background: #181d23;
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
  `,
  title: css`
    display: flex;
    align-items: center;
    gap: 8px;

    &.ant-typography {
      margin: 0;
      font-size: 18px;
    }
  `,
  content: css`
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(280px, 330px);
    align-items: stretch;
    gap: 28px;

    @media (max-width: 900px) {
      grid-template-columns: minmax(0, 1fr);
    }
  `,
  documents: css`
    display: grid;
    align-content: start;
    gap: 16px;
    min-width: 0;
  `,
  document: css`
    min-width: 0;
    padding: 14px 16px 18px;
    border: 1px solid #303a46;
    border-radius: 8px;
    background: #151b21;
  `,
  documentHeader: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  `,
  documentName: css`
    overflow: hidden;
    color: #f0f0f0;
    font-size: 14px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  dueDate: css`
    margin-top: 2px;
    color: #8c8c8c;
    font-size: 13px;
  `,
  board: css`
    min-width: 0;
    text-align: right;

    a {
      color: #b7d7ff;
      font-size: 14px;
    }

    div {
      margin-top: 2px;
      color: #8c8c8c;
      font-size: 13px;
    }
  `,
  timelineViewport: css`
    overflow-x: auto;
    padding: 0 2px 4px;
  `,
  timeline: css`
    display: flex;
    min-width: max-content;
  `,
  timelineStage: css`
    width: 128px;
    min-width: 128px;
  `,
  stageTrack: css`
    position: relative;
    height: 36px;
  `,
  stageLine: css`
    position: absolute;
    top: 17px;
    left: 18px;
    width: calc(100% - 2px);
    height: 3px;
    background: #34404e;
  `,
  stageLineDone: css`
    background: #2fb344;
  `,
  stageMarker: css`
    position: relative;
    z-index: 1;
    display: grid;
    width: 30px;
    height: 30px;
    place-items: center;
    border: 3px solid #2e3b49;
    border-radius: 50%;
    background: #222d38;
    color: #a8b2bd;
    font-size: 11px;
  `,
  stageMarkerCurrent: css`
    border-color: #1677ff;
    background: #1677ff;
    color: #fff;
  `,
  stageMarkerDone: css`
    border-color: #2fb344;
    background: #2fb344;
    color: #fff;
  `,
  stageName: css`
    margin-top: 7px;
    padding-right: 12px;
    overflow: hidden;
    color: #f0f0f0;
    font-size: 13px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  stageStatus: css`
    margin-top: 3px;
    color: #8c8c8c;
    font-size: 12px;
  `,
  stageStatusCurrent: css`
    color: #40a9ff;
  `,
  noBoard: css`
    padding: 8px 0 2px;
    color: #8c8c8c;
    font-size: 13px;
  `,
  summary: css`
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 144px;
    padding: 14px 20px;
    border-radius: 8px;
    background: #111820;
  `,
  summaryLabel: css`
    margin-bottom: 8px;
    color: #bfbfbf;
    font-size: 14px;
  `,
  progress: css`
    margin-bottom: 12px;

    .ant-progress-inner {
      background: #26313d;
    }
  `,
  detail: css`
    display: flex;
    justify-content: space-between;
    gap: 16px;
    color: #8c8c8c;
    font-size: 13px;

    & + & {
      margin-top: 8px;
    }

    strong {
      color: #f0f0f0;
      font-weight: 400;
      text-align: right;
    }
  `,
  empty: css`
    padding: 18px 0 10px;
  `,
};

const getPlannedCompletion = (documents: OrderProductionDocument[]) => {
  const dates = documents
    .map(({ effectiveDueDate }) => effectiveDueDate)
    .filter((date): date is string => Boolean(date))
    .sort();

  return dates.length > 0
    ? dayjs(dates.at(-1)).format(DATE_DEFAULT_FORMAT)
    : 'Без срока';
};

type Props = { groupId: number };

type DocumentTimelineProps = {
  board?: ProductionBoard;
  document: OrderProductionDocument;
};

const getStageState = (
  stageIndex: number,
  currentStageIndex: number,
  currentStageKind: OrderProductionDocument['stageKind'],
) => {
  if (
    stageIndex < currentStageIndex ||
    (stageIndex === currentStageIndex && currentStageKind === 'done')
  ) {
    return 'done';
  }

  return stageIndex === currentStageIndex ? 'current' : 'waiting';
};

const DocumentTimeline: FC<DocumentTimelineProps> = ({ board, document }) => {
  const stages = [...(board?.stages ?? [])]
    .filter(({ archivedAt }) => !archivedAt)
    .sort((first, second) => first.position - second.position);
  const currentStageIndex = stages.findIndex(
    ({ id }) => id === document.stageId,
  );

  return (
    <article className={styles.document}>
      <div className={styles.documentHeader}>
        <div>
          <div className={styles.documentName}>
            №{document.documentNumber} ·{' '}
            {document.name?.trim() || `Документ ${document.documentNumber}`}
          </div>
          <div className={styles.dueDate}>
            Срок:{' '}
            {document.effectiveDueDate
              ? dayjs(document.effectiveDueDate).format(DATE_DEFAULT_FORMAT)
              : 'без срока'}
          </div>
        </div>
        <div className={styles.board}>
          {document.boardId ? (
            <>
              <Link to="/production">{document.boardName}</Link>
              <div>{document.stageName || 'Этап не указан'}</div>
            </>
          ) : (
            <div>Не назначен на доску</div>
          )}
        </div>
      </div>

      {stages.length > 0 && currentStageIndex >= 0 ? (
        <div className={styles.timelineViewport}>
          <div className={styles.timeline}>
            {stages.map((stage, stageIndex) => {
              const state = getStageState(
                stageIndex,
                currentStageIndex,
                document.stageKind,
              );
              const isLast = stageIndex === stages.length - 1;

              return (
                <div className={styles.timelineStage} key={stage.id}>
                  <div className={styles.stageTrack}>
                    {!isLast && (
                      <div
                        className={`${styles.stageLine} ${
                          stageIndex < currentStageIndex
                            ? styles.stageLineDone
                            : ''
                        }`}
                      />
                    )}
                    <div
                      className={`${styles.stageMarker} ${
                        state === 'done'
                          ? styles.stageMarkerDone
                          : state === 'current'
                            ? styles.stageMarkerCurrent
                            : ''
                      }`}
                    >
                      {state === 'done' ? <CheckOutlined /> : '●'}
                    </div>
                  </div>
                  <div className={styles.stageName}>{stage.name}</div>
                  <div
                    className={`${styles.stageStatus} ${
                      state === 'current' ? styles.stageStatusCurrent : ''
                    }`}
                  >
                    {state === 'done'
                      ? 'Пройдено'
                      : state === 'current'
                        ? 'В работе'
                        : 'Ожидает'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={styles.noBoard}>
          {document.boardId
            ? 'Этапы доски временно недоступны'
            : 'Добавьте документ на производственную доску'}
        </div>
      )}
    </article>
  );
};

export const OrderProductionSummary: FC<Props> = ({ groupId }) => {
  const { data, error, isLoading } = useOrderProduction(groupId);
  const boardIds = useMemo(
    () => [
      ...new Set(
        (data?.documents ?? [])
          .map(({ boardId }) => boardId)
          .filter((boardId): boardId is string => Boolean(boardId)),
      ),
    ],
    [data?.documents],
  );
  const { data: boards } = useSWR(
    boardIds.length > 0 ? ['order-production-boards', ...boardIds] : null,
    () => Promise.all(boardIds.map(getProductionBoard)),
  );
  const boardsById = useMemo(
    () => new Map((boards ?? []).map((board) => [board.id, board])),
    [boards],
  );

  if (error) {
    return (
      <Alert showIcon type="error" title="Не удалось загрузить производство" />
    );
  }

  if (isLoading) {
    return (
      <section
        className={styles.container}
        aria-label="Производственная сводка"
      >
        <Skeleton active paragraph={{ rows: 4 }} />
      </section>
    );
  }

  const documents = data?.documents ?? [];
  const progressPercent = Math.round(data?.progressPercent ?? 0);

  return (
    <section className={styles.container} aria-label="Производственная сводка">
      <div className={styles.header}>
        <Typography.Title className={styles.title} level={5}>
          <SettingOutlined />
          Производство
        </Typography.Title>
      </div>

      {documents.length > 0 ? (
        <div className={styles.content}>
          <div className={styles.documents}>
            {documents.map((document) => (
              <DocumentTimeline
                board={
                  document.boardId
                    ? boardsById.get(document.boardId)
                    : undefined
                }
                document={document}
                key={document.id}
              />
            ))}
          </div>

          <aside className={styles.summary} aria-label="Прогресс заказа">
            <div className={styles.summaryLabel}>Прогресс заказа</div>
            <Progress
              className={styles.progress}
              percent={progressPercent}
              strokeColor="#1677ff"
            />
            <div className={styles.detail}>
              <span>На доске</span>
              <strong>
                {data?.trackedCount ?? 0} из {data?.documentCount ?? 0}
              </strong>
            </div>
            <div className={styles.detail}>
              <span>Плановое завершение</span>
              <strong>{getPlannedCompletion(documents)}</strong>
            </div>
          </aside>
        </div>
      ) : (
        <Empty
          className={styles.empty}
          description="В заказе пока нет документов"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </section>
  );
};
