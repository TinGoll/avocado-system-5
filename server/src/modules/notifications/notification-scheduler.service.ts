import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource, IsNull } from 'typeorm';
import { runDatabaseTransaction } from '../database/database-transaction';
import { OrderManagementEvent } from '../order-management/entities/order-management-event.entity';
import { OrderManagementSettings } from '../order-management/entities/order-management-settings.entity';
import { PreviewNotificationRuleDto } from './dto/notification-rule.dto';
import { Notification } from './entities/notification.entity';
import { NotificationRule } from './entities/notification-rule.entity';
import { evaluateNotificationRule } from './notification-evaluator';
import type { NotificationEvaluationContext } from './notification-rule.types';
import { renderNotificationTemplate } from './notification-template-renderer';
import { NotificationsService } from './notifications.service';

export interface NotificationSchedulerState {
  enabled: boolean;
  running: boolean;
  lastStartedAt: Date | null;
  lastSucceededAt: Date | null;
  lastError: string | null;
  lastCreatedCount: number;
  lastProcessedEventCount: number;
}

const temporalTriggers = new Set(['due_soon', 'overdue', 'stage_stalled']);

@Injectable()
export class NotificationSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  private running = false;
  private readonly enabled =
    process.env.NOTIFICATIONS_SCHEDULER_ENABLED?.toLowerCase() !== 'false';
  private stateValue: NotificationSchedulerState = {
    enabled: this.enabled,
    running: false,
    lastStartedAt: null,
    lastSucceededAt: null,
    lastError: null,
    lastCreatedCount: 0,
    lastProcessedEventCount: 0,
  };

  constructor(
    private readonly source: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  state() {
    return this.stateValue;
  }

  onApplicationBootstrap() {
    if (this.enabled) void this.run();
  }

  @Cron('0 */5 * * * *', { waitForCompletion: true })
  scheduledRun() {
    return this.run();
  }

  async run() {
    if (!this.enabled || this.running) return;
    this.running = true;
    const startedAt = new Date();
    this.stateValue = {
      ...this.stateValue,
      running: true,
      lastStartedAt: startedAt,
    };
    try {
      const now = new Date();
      const settings = await this.source.manager.findOneByOrFail(
        OrderManagementSettings,
        { id: 1 },
      );
      const beforeCount = await this.source.manager.count(Notification);
      await this.processTemporal(now, settings.timeZone);
      const events = await this.processEvents(now, settings.timeZone);
      const created =
        (await this.source.manager.count(Notification)) - beforeCount;
      this.stateValue = {
        ...this.stateValue,
        running: false,
        lastSucceededAt: new Date(),
        lastError: null,
        lastCreatedCount: created,
        lastProcessedEventCount: events.processed,
      };
      this.logger.log(
        `Notification pass completed: created=${this.stateValue.lastCreatedCount}, events=${events.processed}, durationMs=${Date.now() - startedAt.getTime()}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.stateValue = {
        ...this.stateValue,
        running: false,
        lastError: message,
      };
      this.logger.error(`Notification pass failed: ${message}`);
    } finally {
      this.running = false;
    }
  }

  private async processTemporal(now: Date, timeZone: string) {
    const rules = await this.source.manager.find(NotificationRule, {
      where: { enabled: true },
      order: { id: 'ASC' },
    });
    let created = 0;
    for (const rule of rules.filter((item) =>
      temporalTriggers.has(item.trigger),
    )) {
      const dto = Object.assign(new PreviewNotificationRuleDto(), rule, {
        limit: 100,
      });
      const contexts = await this.notifications.evaluationContexts(dto);
      const currentKeys: string[] = [];
      for (const context of contexts) {
        if (!evaluateNotificationRule(rule, context, now, timeZone)) continue;
        const key = this.temporalKey(rule, context, now, timeZone);
        currentKeys.push(key);
        const result = await this.source.manager
          .createQueryBuilder()
          .insert()
          .into(Notification)
          .values(this.notification(rule, context, key))
          .orIgnore()
          .execute();
        created += this.insertedCount(result.raw, result.identifiers.length);
      }
      const stale = this.source.manager
        .createQueryBuilder()
        .update(Notification)
        .set({ resolvedAt: now })
        .where('ruleId = :ruleId AND resolvedAt IS NULL', { ruleId: rule.id });
      if (currentKeys.length)
        stale.andWhere('dedupKey NOT IN (:...currentKeys)', { currentKeys });
      await stale.execute();
    }
    await this.source.manager
      .createQueryBuilder()
      .update(Notification)
      .set({ resolvedAt: now })
      .where('resolvedAt IS NULL')
      .andWhere(
        'ruleId IN (SELECT id FROM notification_rules WHERE enabled = :enabled)',
        { enabled: false },
      )
      .execute();
    return created;
  }

  private async processEvents(now: Date, timeZone: string) {
    const eventIds = (
      await this.source.manager.find(OrderManagementEvent, {
        where: { notificationProcessedAt: IsNull() },
        order: { occurredAt: 'ASC', id: 'ASC' },
        take: 100,
        select: { id: true },
      })
    ).map((event) => event.id);
    let created = 0;
    let processed = 0;
    for (const eventId of eventIds) {
      const count = await runDatabaseTransaction(
        this.source,
        async (manager) => {
          const event = await manager.findOneBy(OrderManagementEvent, {
            id: eventId,
            notificationProcessedAt: IsNull(),
          });
          if (!event) return 0;
          const rules = (
            await manager.find(NotificationRule, { where: { enabled: true } })
          ).filter((rule) => rule.trigger === event.type);
          let inserted = 0;
          for (const rule of rules) {
            if (event.occurredAt < rule.activatedAt) continue;
            const context = this.eventContext(rule, event);
            if (
              !context ||
              !evaluateNotificationRule(rule, context, now, timeZone)
            )
              continue;
            const result = await manager
              .createQueryBuilder()
              .insert()
              .into(Notification)
              .values(
                this.notification(
                  rule,
                  context,
                  `${rule.id}:${rule.revision}:${event.id}`,
                ),
              )
              .orIgnore()
              .execute();
            inserted += this.insertedCount(
              result.raw,
              result.identifiers.length,
            );
          }
          await manager.update(OrderManagementEvent, event.id, {
            notificationProcessedAt: now,
          });
          return inserted;
        },
      );
      created += count;
      processed += 1;
    }
    return { created, processed };
  }

  private notification(
    rule: NotificationRule,
    context: NotificationEvaluationContext,
    dedupKey: string,
  ) {
    return {
      dedupKey,
      ruleId: rule.id,
      ruleRevision: rule.revision,
      orderGroupId: context.orderGroupId,
      orderId: context.documentId ?? null,
      trigger: rule.trigger,
      severity: rule.severity,
      message: renderNotificationTemplate(rule.messageTemplate, context),
      targetSnapshot: {
        orderNumber: context.orderNumber,
        documentNumber: context.documentNumber ?? null,
        documentName: context.documentName ?? null,
      },
      readAt: null,
      resolvedAt: null,
    };
  }

  private insertedCount(raw: unknown, fallback: number) {
    if (typeof raw === 'number') return raw;
    if (Array.isArray(raw)) return raw.length;
    if (raw && typeof raw === 'object' && 'changes' in raw) {
      const changes = (raw as { changes?: unknown }).changes;
      if (typeof changes === 'number') return changes;
    }
    return fallback;
  }

  private temporalKey(
    rule: NotificationRule,
    context: NotificationEvaluationContext,
    now: Date,
    timeZone: string,
  ) {
    const target = context.documentId ?? String(context.orderGroupId);
    const episode =
      rule.trigger === 'stage_stalled'
        ? `${context.cardId}:${context.enteredStageAt?.toISOString()}`
        : (context.documentDueDate || context.orderDueDate)!;
    const day =
      rule.repeat === 'daily' ? `:${this.localDate(now, timeZone)}` : '';
    return `${rule.id}:${rule.revision}:${target}:${episode}${day}`;
  }

  private localDate(value: Date, timeZone: string) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);
  }

  private eventContext(rule: NotificationRule, event: OrderManagementEvent) {
    if (event.orderGroupId === null) return null;
    return {
      scope: rule.scope,
      orderGroupId: event.orderGroupId,
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
      eventType: event.type,
      eventBefore: event.before,
      eventAfter: event.after,
    } satisfies NotificationEvaluationContext;
  }
}
