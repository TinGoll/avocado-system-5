import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Brackets, DataSource, In } from 'typeorm';
import { runDatabaseTransaction } from '../database/database-transaction';
import { CustomOrderStatus } from '../order-management/entities/custom-order-status.entity';
import { OrderManagementEvent } from '../order-management/entities/order-management-event.entity';
import { OrderManagementSettings } from '../order-management/entities/order-management-settings.entity';
import { OrderGroup } from '../order-groups/entities/order-group.entity';
import { Order } from '../orders/entities/order.entity';
import { ProductionBoard } from '../production-boards/entities/production-board.entity';
import { ProductionCard } from '../production-boards/entities/production-card.entity';
import { ProductionStage } from '../production-boards/entities/production-stage.entity';
import {
  CreateNotificationRuleDto,
  PreviewNotificationRuleDto,
  UpdateNotificationRuleDto,
} from './dto/notification-rule.dto';
import { NotificationRule } from './entities/notification-rule.entity';
import { Notification } from './entities/notification.entity';
import {
  NotificationFeedQueryDto,
  ReadNotificationDto,
} from './dto/notification-feed.dto';
import { evaluateNotificationRule } from './notification-evaluator';
import type { NotificationEvaluationContext } from './notification-rule.types';
import {
  renderNotificationTemplate,
  validateMessageTemplate,
} from './notification-template-renderer';

@Injectable()
export class NotificationsService {
  constructor(private readonly source: DataSource) {}

  list() {
    return this.source.manager.find(NotificationRule, {
      order: { name: 'ASC', id: 'ASC' },
    });
  }

  async feed(query: NotificationFeedQueryDto) {
    const builder = this.source.manager
      .createQueryBuilder(Notification, 'notification')
      .orderBy('notification.createdAt', 'DESC')
      .addOrderBy('notification.id', 'DESC')
      .take(query.limit + 1);
    if (query.cursor) {
      let cursor: { createdAt: string; id: string };
      try {
        cursor = JSON.parse(
          Buffer.from(query.cursor, 'base64url').toString('utf8'),
        ) as { createdAt: string; id: string };
        if (!cursor.createdAt || !cursor.id) throw new Error('invalid');
      } catch {
        throw new BadRequestException('Invalid notification cursor');
      }
      builder.andWhere(
        new Brackets((where) => {
          where
            .where('notification.createdAt < :createdAt', cursor)
            .orWhere(
              'notification.createdAt = :createdAt AND notification.id < :id',
              cursor,
            );
        }),
      );
    }
    const rows = await builder.getMany();
    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit);
    const last = hasMore ? items.at(-1) : undefined;
    return {
      items,
      meta: {
        nextCursor: last
          ? Buffer.from(
              JSON.stringify({
                createdAt: last.createdAt.toISOString(),
                id: last.id,
              }),
            ).toString('base64url')
          : null,
      },
    };
  }

  async setRead(id: string, dto: ReadNotificationDto) {
    const notification = await this.source.manager.findOneBy(Notification, {
      id,
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (dto.read && !notification.readAt)
      await this.source.manager.update(Notification, id, {
        readAt: new Date(),
      });
    if (!dto.read && notification.readAt)
      await this.source.manager.update(Notification, id, { readAt: null });
    return this.source.manager.findOneByOrFail(Notification, { id });
  }

  private async validateRule(
    dto: CreateNotificationRuleDto,
    manager = this.source.manager,
  ) {
    validateMessageTemplate(dto.messageTemplate, dto.scope);
    const temporal = ['due_soon', 'overdue', 'stage_stalled'].includes(
      dto.trigger,
    );
    if (!temporal && dto.repeat !== 'once')
      throw new BadRequestException('Event rules support once repeat only');
    if (dto.trigger === 'stage_stalled' && dto.scope !== 'document')
      throw new BadRequestException(
        'stage_stalled supports document scope only',
      );
    if (
      ['due_soon', 'stage_stalled'].includes(dto.trigger) &&
      dto.conditions.days === undefined
    )
      throw new BadRequestException('This trigger requires days');
    if (
      !['due_soon', 'stage_stalled'].includes(dto.trigger) &&
      dto.conditions.days !== undefined
    )
      throw new BadRequestException('days is incompatible with trigger');
    const eventFields = [
      'fromStageIn',
      'toStageIn',
      'fromCustomStatusIn',
      'toCustomStatusIn',
      'fromSystemStatusIn',
      'toSystemStatusIn',
    ] as const;
    const allowedEventPrefix =
      dto.trigger === 'stage_changed'
        ? 'Stage'
        : dto.trigger === 'custom_status_changed'
          ? 'CustomStatus'
          : dto.trigger === 'lifecycle_changed'
            ? 'SystemStatus'
            : null;
    if (
      eventFields.some(
        (field) =>
          dto.conditions[field]?.length &&
          !field.includes(allowedEventPrefix ?? '!'),
      )
    )
      throw new BadRequestException(
        'Event conditions are incompatible with trigger',
      );
    if (dto.scope === 'document' && dto.trigger === 'lifecycle_changed')
      throw new BadRequestException(
        'lifecycle_changed supports group scope only',
      );

    const statusIds = [
      ...(dto.conditions.customStatusIn ?? []),
      ...(dto.conditions.customStatusNotIn ?? []),
      ...(dto.conditions.fromCustomStatusIn ?? []),
      ...(dto.conditions.toCustomStatusIn ?? []),
    ];
    if (statusIds.length) {
      const statuses = await manager.findBy(CustomOrderStatus, {
        id: In([...new Set(statusIds)]),
      });
      if (
        statuses.length !== new Set(statusIds).size ||
        statuses.some((status) => status.scope !== dto.scope)
      )
        throw new BadRequestException(
          'Custom status does not exist or has incompatible scope',
        );
    }
    const boardIds = [...new Set(dto.conditions.boardIn ?? [])];
    if (
      boardIds.length &&
      (await manager.countBy(ProductionBoard, { id: In(boardIds) })) !==
        boardIds.length
    )
      throw new BadRequestException('Production board not found');
    const stageIds = [
      ...(dto.conditions.stageIn ?? []),
      ...(dto.conditions.fromStageIn ?? []),
      ...(dto.conditions.toStageIn ?? []),
    ];
    if (stageIds.length) {
      const stages = await manager.findBy(ProductionStage, {
        id: In([...new Set(stageIds)]),
      });
      if (stages.length !== new Set(stageIds).size)
        throw new BadRequestException('Production stage not found');
      if (
        boardIds.length &&
        stages.some((stage) => !boardIds.includes(stage.boardId))
      )
        throw new BadRequestException(
          'Stage does not belong to selected boards',
        );
    }
  }

  async create(dto: CreateNotificationRuleDto) {
    await this.validateRule(dto);
    return this.source.manager.save(
      NotificationRule,
      this.source.manager.create(NotificationRule, {
        ...dto,
        revision: 1,
        activatedAt: new Date(),
      }),
    );
  }

  update(id: string, dto: UpdateNotificationRuleDto) {
    return runDatabaseTransaction(this.source, async (manager) => {
      await this.validateRule(dto, manager);
      const result = await manager
        .createQueryBuilder()
        .update(NotificationRule)
        .set({
          name: dto.name,
          enabled: dto.enabled,
          scope: dto.scope,
          trigger: dto.trigger,
          conditions: dto.conditions,
          repeat: dto.repeat,
          messageTemplate: dto.messageTemplate,
          severity: dto.severity,
          revision: () => 'revision + 1',
          activatedAt: new Date(),
        })
        .where('id = :id AND revision = :revision', {
          id,
          revision: dto.expectedRevision,
        })
        .execute();
      if (!result.affected) {
        if (!(await manager.existsBy(NotificationRule, { id })))
          throw new NotFoundException('Notification rule not found');
        throw new ConflictException(
          'Notification rule changed; reload and retry',
        );
      }
      await manager
        .createQueryBuilder()
        .update(Notification)
        .set({ resolvedAt: new Date() })
        .where('ruleId = :id AND resolvedAt IS NULL', { id })
        .execute();
      return manager.findOneByOrFail(NotificationRule, { id });
    });
  }

  async preview(dto: PreviewNotificationRuleDto) {
    await this.validateRule(dto);
    const settings = await this.source.manager.findOneByOrFail(
      OrderManagementSettings,
      { id: 1 },
    );
    const rule = this.source.manager.create(NotificationRule, {
      ...dto,
      id: 'preview',
      revision: 1,
      activatedAt: new Date(),
    });
    const now = new Date();
    const contexts = await this.evaluationContexts(dto);
    const evaluated = contexts
      .filter((context) =>
        evaluateNotificationRule(rule, context, now, settings.timeZone),
      )
      .map((context) => ({
        target: this.target(context),
        message: renderNotificationTemplate(dto.messageTemplate, context),
        possibleRepeat: dto.repeat === 'daily',
      }));
    const matches = [
      ...new Map(
        evaluated.map((match) => [JSON.stringify(match.target), match]),
      ).values(),
    ].slice(0, dto.limit);
    return {
      items: matches,
      meta: { count: matches.length, limit: dto.limit },
    };
  }

  private target(context: NotificationEvaluationContext) {
    return context.scope === 'group'
      ? { type: 'order' as const, orderGroupId: context.orderGroupId }
      : {
          type: 'document' as const,
          orderGroupId: context.orderGroupId,
          documentId: context.documentId!,
        };
  }

  async evaluationContexts(dto: PreviewNotificationRuleDto) {
    if (
      ['stage_changed', 'custom_status_changed', 'lifecycle_changed'].includes(
        dto.trigger,
      )
    )
      return this.eventContexts(dto);
    const groups = await this.source.manager.find(OrderGroup, {
      where: dto.orderGroupId ? { id: dto.orderGroupId } : {},
      relations: { orders: true },
      order: { id: 'ASC' },
    });
    const orderIds = groups.flatMap((group) =>
      group.orders.map((order) => order.id),
    );
    const cards = orderIds.length
      ? await this.source.manager.find(ProductionCard, {
          where: { orderId: In(orderIds) },
          relations: { stage: true },
        })
      : [];
    const cardByOrder = new Map(cards.map((card) => [card.orderId, card]));
    const result: NotificationEvaluationContext[] = [];
    for (const group of groups) {
      const documents = dto.orderId
        ? group.orders.filter((order) => order.id === dto.orderId)
        : group.orders;
      if (dto.scope === 'group') {
        const matchingCards = documents
          .map((order) => cardByOrder.get(order.id))
          .filter(Boolean);
        if (dto.conditions.boardIn?.length || dto.conditions.stageIn?.length) {
          for (const card of matchingCards)
            result.push(this.groupContext(group, card));
        } else result.push(this.groupContext(group));
      } else {
        for (const order of documents)
          result.push(
            this.documentContext(group, order, cardByOrder.get(order.id)),
          );
      }
    }
    return result;
  }

  private groupContext(
    group: OrderGroup,
    card?: ProductionCard,
  ): NotificationEvaluationContext {
    return {
      scope: 'group',
      orderGroupId: group.id,
      orderNumber: group.orderNumber,
      orderStatus: group.status,
      orderDueDate: group.dueDate,
      orderCustomStatusId: group.customStatusId,
      ...(card
        ? {
            cardId: card.id,
            boardId: card.stage.boardId,
            stageId: card.stageId,
            stageName: card.stage.name,
            stageKind: card.stage.kind,
            enteredStageAt: card.enteredStageAt,
          }
        : {}),
    };
  }

  private documentContext(
    group: OrderGroup,
    order: Order,
    card?: ProductionCard,
  ): NotificationEvaluationContext {
    return {
      ...this.groupContext(group, card),
      scope: 'document',
      documentId: order.id,
      documentNumber: order.documentNumber,
      documentName: order.name ?? null,
      documentDueDate: order.dueDate,
      documentCustomStatusId: order.customStatusId,
    };
  }

  private async eventContexts(dto: PreviewNotificationRuleDto) {
    const events = await this.source.manager.find(OrderManagementEvent, {
      where: {
        type: dto.trigger as 'stage_changed',
        ...(dto.orderGroupId ? { orderGroupId: dto.orderGroupId } : {}),
        ...(dto.orderId ? { orderId: dto.orderId } : {}),
      },
      order: { occurredAt: 'DESC', id: 'DESC' },
      take: dto.limit * 5,
    });
    return events
      .filter((event) => event.orderGroupId !== null)
      .map(
        (event): NotificationEvaluationContext => ({
          scope: dto.scope,
          orderGroupId: event.orderGroupId!,
          orderNumber: event.targetSnapshot.orderNumber ?? '',
          orderStatus: (event.after.status ??
            event.before.status ??
            'draft') as NotificationEvaluationContext['orderStatus'],
          orderDueDate: null,
          orderCustomStatusId: null,
          documentId: event.orderId ?? undefined,
          documentNumber: event.targetSnapshot.documentNumber ?? undefined,
          documentName: event.targetSnapshot.documentName,
          boardId: (event.after.boardId ?? event.before.boardId) as
            | string
            | undefined,
          stageId: (event.after.stageId ?? event.before.stageId) as
            | string
            | undefined,
          stageName: (event.after.stageName ?? event.before.stageName) as
            | string
            | undefined,
          eventType: event.type,
          eventBefore: event.before,
          eventAfter: event.after,
        }),
      );
  }
}
