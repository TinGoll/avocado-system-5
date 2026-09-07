import { runDatabaseTransaction } from '../database/database-transaction';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  OrderGroup,
  OrderStatus,
} from '../order-groups/entities/order-group.entity';
import { Order } from '../orders/entities/order.entity';
import { CustomOrderStatus } from './entities/custom-order-status.entity';
import { OrderManagementEvent } from './entities/order-management-event.entity';
import { OrderManagementSettings } from './entities/order-management-settings.entity';
import { OrderManagementEventService } from './order-management-event.service';
import {
  CreateCustomStatusDto,
  CustomStatusQueryDto,
  ManagementHistoryQueryDto,
  UpdateCustomStatusDto,
  UpdateDocumentManagementDto,
  UpdateGroupManagementDto,
  UpdateManagementSettingsDto,
} from './dto/management.dto';

type GroupDetails = Pick<
  OrderGroup,
  'orderNumber' | 'customer' | 'comment' | 'startedAt'
>;

@Injectable()
export class OrderManagementService {
  constructor(
    private readonly source: DataSource,
    private readonly journal: OrderManagementEventService,
  ) {}

  private transaction<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return runDatabaseTransaction(this.source, work);
  }

  private async group(manager: EntityManager, id: number) {
    const group = await manager.findOne(OrderGroup, {
      where: { id },
      relations: { customStatus: true },
    });
    if (!group) throw new NotFoundException('Order group not found');
    return group;
  }

  private async document(manager: EntityManager, id: string) {
    const order = await manager.findOne(Order, {
      where: { id },
      loadEagerRelations: false,
      relations: { orderGroup: true, customStatus: true },
    });
    if (!order) throw new NotFoundException('Order document not found');
    return order;
  }

  private groupView(group: OrderGroup) {
    return {
      id: group.id,
      dueDate: group.dueDate,
      effectiveDueDate: group.dueDate,
      customStatusId: group.customStatusId,
      customStatus: group.customStatus,
      managementVersion: group.managementVersion,
      status: group.status,
    };
  }

  private documentView(order: Order) {
    return {
      id: order.id,
      orderGroupId: order.orderGroup?.id ?? null,
      dueDate: order.dueDate,
      effectiveDueDate: order.dueDate ?? order.orderGroup?.dueDate ?? null,
      customStatusId: order.customStatusId,
      customStatus: order.customStatus,
      managementVersion: order.managementVersion,
    };
  }

  async getGroup(id: number) {
    return this.groupView(await this.group(this.source.manager, id));
  }
  async getDocument(id: string) {
    return this.documentView(await this.document(this.source.manager, id));
  }

  private async claimGroup(
    manager: EntityManager,
    id: number,
    expectedVersion?: number,
  ) {
    const result = await manager
      .createQueryBuilder()
      .update(OrderGroup)
      .set({ managementVersion: () => '"managementVersion" + 1' })
      .where('id = :id', { id })
      .andWhere(
        expectedVersion === undefined
          ? '1 = 1'
          : '"managementVersion" = :expectedVersion',
        { expectedVersion },
      )
      .execute();
    if (!result.affected) {
      if (!(await manager.existsBy(OrderGroup, { id })))
        throw new NotFoundException('Order group not found');
      throw new ConflictException('Order group was changed; reload and retry');
    }
  }

  private checkLifecycle(current: OrderStatus, dto: UpdateGroupManagementDto) {
    const next = dto.status;
    if (next === undefined || next === current) return;
    if (next === OrderStatus.DRAFT)
      throw new BadRequestException('Returning to draft is not supported');
    const terminal =
      current === OrderStatus.COMPLETED || current === OrderStatus.CANCELLED;
    if (
      terminal &&
      (next !== OrderStatus.IN_PRODUCTION || !dto.reason?.trim())
    ) {
      throw new BadRequestException(
        'Reopening requires in_production and a reason',
      );
    }
    // OM-04 must replace this condition with actual production readiness.
    // Until cards exist, every close explicitly acknowledges incomplete tracking.
    if (
      next === OrderStatus.COMPLETED &&
      (dto.confirmIncompleteProduction !== true || !dto.reason?.trim())
    ) {
      throw new BadRequestException(
        'Closing requires confirmIncompleteProduction and a reason',
      );
    }
  }

  private async statusForAssignment(
    manager: EntityManager,
    id: string | null | undefined,
    scope: 'group' | 'document',
  ) {
    if (id == null) return null;
    // Serialize assignment with archive/delete, using a portable UPDATE lock.
    const result = await manager
      .createQueryBuilder()
      .update(CustomOrderStatus)
      .set({ position: () => 'position' })
      .where('id = :id', { id })
      .execute();
    if (!result.affected)
      throw new BadRequestException('Custom status not found');
    const status = await manager.findOneByOrFail(CustomOrderStatus, { id });
    if (status.scope !== scope || status.archivedAt)
      throw new BadRequestException(
        'Custom status has incompatible scope or is archived',
      );
    return status;
  }

  async updateGroup(
    id: number,
    dto: UpdateGroupManagementDto,
    details: Partial<GroupDetails> = {},
  ) {
    if (!Number.isSafeInteger(dto.expectedVersion) || dto.expectedVersion < 0)
      throw new BadRequestException('expectedVersion is required');
    return this.transaction(async (manager) => {
      await this.claimGroup(manager, id, dto.expectedVersion);
      const group = await this.group(manager, id);
      this.checkLifecycle(group.status, dto);
      const targetSnapshot = {
        orderNumber: group.orderNumber,
        documentNumber: null,
        documentName: null,
      };
      const changes: Partial<
        GroupDetails & Pick<OrderGroup, 'dueDate' | 'customStatusId' | 'status'>
      > = { ...details };
      if (dto.dueDate !== undefined && dto.dueDate !== group.dueDate) {
        changes.dueDate = dto.dueDate;
        await this.journal.record(manager, {
          orderGroupId: id,
          type: 'due_date_changed',
          before: { dueDate: group.dueDate },
          after: { dueDate: dto.dueDate },
          targetSnapshot,
        });
      }
      if (
        dto.customStatusId !== undefined &&
        dto.customStatusId !== group.customStatusId
      ) {
        const status = await this.statusForAssignment(
          manager,
          dto.customStatusId,
          'group',
        );
        changes.customStatusId = dto.customStatusId;
        await this.journal.record(manager, {
          orderGroupId: id,
          type: 'custom_status_changed',
          before: {
            customStatusId: group.customStatusId,
            name: group.customStatus?.name ?? null,
          },
          after: {
            customStatusId: dto.customStatusId,
            name: status?.name ?? null,
          },
          targetSnapshot,
        });
      }
      if (dto.status !== undefined && dto.status !== group.status) {
        changes.status = dto.status;
        await this.journal.record(manager, {
          orderGroupId: id,
          type: 'lifecycle_changed',
          before: { status: group.status },
          after: {
            status: dto.status,
            confirmIncompleteProduction:
              dto.confirmIncompleteProduction ?? false,
          },
          targetSnapshot,
          reason: dto.reason?.trim(),
        });
      }
      if (Object.values(changes).some((value) => value !== undefined))
        await manager.update(OrderGroup, id, changes);
      return this.groupView(await this.group(manager, id));
    });
  }

  async updateDocument(id: string, dto: UpdateDocumentManagementDto) {
    return this.transaction(async (manager) => {
      const initial = await this.document(manager, id);
      if (initial.orderGroup)
        await this.claimGroup(manager, initial.orderGroup.id);
      const claimed = await manager
        .createQueryBuilder()
        .update(Order)
        .set({ managementVersion: () => '"managementVersion" + 1' })
        .where('id = :id AND "managementVersion" = :version', {
          id,
          version: dto.expectedVersion,
        })
        .execute();
      if (!claimed.affected) {
        if (!(await manager.existsBy(Order, { id })))
          throw new NotFoundException('Order document not found');
        throw new ConflictException(
          'Order document was changed; reload and retry',
        );
      }
      const order = await this.document(manager, id);
      if (order.orderGroup?.id !== initial.orderGroup?.id)
        throw new ConflictException('Order group changed; reload and retry');
      const targetSnapshot = {
        orderNumber: order.orderGroup?.orderNumber ?? null,
        documentNumber: order.documentNumber,
        documentName: order.name ?? null,
      };
      const changes: Partial<Pick<Order, 'dueDate' | 'customStatusId'>> = {};
      const orderGroupId = order.orderGroup?.id;
      if (dto.dueDate !== undefined && dto.dueDate !== order.dueDate) {
        changes.dueDate = dto.dueDate;
        await this.journal.record(manager, {
          orderId: id,
          orderGroupId,
          type: 'due_date_changed',
          before: { dueDate: order.dueDate },
          after: { dueDate: dto.dueDate },
          targetSnapshot,
        });
      }
      if (
        dto.customStatusId !== undefined &&
        dto.customStatusId !== order.customStatusId
      ) {
        const status = await this.statusForAssignment(
          manager,
          dto.customStatusId,
          'document',
        );
        changes.customStatusId = dto.customStatusId;
        await this.journal.record(manager, {
          orderId: id,
          orderGroupId,
          type: 'custom_status_changed',
          before: {
            customStatusId: order.customStatusId,
            name: order.customStatus?.name ?? null,
          },
          after: {
            customStatusId: dto.customStatusId,
            name: status?.name ?? null,
          },
          targetSnapshot,
        });
      }
      if (Object.values(changes).some((value) => value !== undefined))
        await manager.update(Order, id, changes);
      return this.documentView(await this.document(manager, id));
    });
  }

  listStatuses(query: CustomStatusQueryDto) {
    return this.source.manager.find(CustomOrderStatus, {
      where: query.scope ? { scope: query.scope } : {},
      order: { position: 'ASC', id: 'ASC' },
    });
  }

  createStatus(dto: CreateCustomStatusDto) {
    return this.transaction((manager) =>
      manager.save(
        CustomOrderStatus,
        manager.create(CustomOrderStatus, {
          ...dto,
          archivedAt: null,
        }),
      ),
    );
  }

  private async lockStatus(manager: EntityManager, id: string) {
    const result = await manager
      .createQueryBuilder()
      .update(CustomOrderStatus)
      .set({ position: () => 'position' })
      .where('id = :id', { id })
      .execute();
    if (!result.affected)
      throw new NotFoundException('Custom status not found');
  }

  async updateStatus(id: string, dto: UpdateCustomStatusDto) {
    return this.transaction(async (manager) => {
      await this.lockStatus(manager, id);
      if (Object.values(dto).some((value) => value !== undefined))
        await manager.update(CustomOrderStatus, id, dto);
      return manager.findOneByOrFail(CustomOrderStatus, { id });
    });
  }

  async archiveStatus(id: string) {
    return this.transaction(async (manager) => {
      await this.lockStatus(manager, id);
      const status = await manager.findOneByOrFail(CustomOrderStatus, { id });
      if (!status.archivedAt)
        await manager.update(CustomOrderStatus, id, { archivedAt: new Date() });
      return manager.findOneByOrFail(CustomOrderStatus, { id });
    });
  }

  async deleteStatus(id: string) {
    return this.transaction(async (manager) => {
      await this.lockStatus(manager, id);
      const assigned =
        (await manager.existsBy(OrderGroup, { customStatusId: id })) ||
        (await manager.existsBy(Order, { customStatusId: id }));
      const used = await manager
        .createQueryBuilder(OrderManagementEvent, 'event')
        .where('event.type = :type', { type: 'custom_status_changed' })
        .andWhere(
          '(CAST(event.before AS text) LIKE :id OR CAST(event.after AS text) LIKE :id)',
          { id: `%"${id}"%` },
        )
        .getExists();
      if (assigned || used)
        throw new ConflictException('Used custom statuses must be archived');
      await manager.delete(CustomOrderStatus, id);
      return { id };
    });
  }

  getSettings() {
    return this.source.manager.findOneByOrFail(OrderManagementSettings, {
      id: 1,
    });
  }
  async updateSettings(dto: UpdateManagementSettingsDto) {
    return this.transaction(async (manager) => {
      await manager.update(OrderManagementSettings, 1, {
        timeZone: dto.timeZone,
      });
      return manager.findOneByOrFail(OrderManagementSettings, { id: 1 });
    });
  }

  async history(query: ManagementHistoryQueryDto) {
    const items = await this.source.manager.find(OrderManagementEvent, {
      where: {
        ...(query.orderGroupId !== undefined
          ? { orderGroupId: query.orderGroupId }
          : {}),
        ...(query.orderId ? { orderId: query.orderId } : {}),
      },
      order: { occurredAt: 'DESC', id: 'DESC' },
      skip: query.offset,
      take: query.limit + 1,
    });
    const hasMore = items.length > query.limit;
    return {
      items: items.slice(0, query.limit),
      meta: { nextOffset: hasMore ? query.offset + query.limit : null },
    };
  }

  async removeDocument(id: string) {
    return this.transaction(async (manager) => {
      const initial = await this.document(manager, id);
      if (initial.orderGroup)
        await this.claimGroup(manager, initial.orderGroup.id);
      await manager.increment(Order, { id }, 'managementVersion', 1);
      const order = await this.document(manager, id);
      if (initial.orderGroup?.id !== order.orderGroup?.id)
        throw new ConflictException('Order group changed; retry');
      await this.journal.record(manager, {
        orderId: id,
        orderGroupId: order.orderGroup?.id,
        type: 'document_deleted',
        before: {
          dueDate: order.dueDate,
          customStatusId: order.customStatusId,
          customStatusName: order.customStatus?.name ?? null,
        },
        after: {},
        targetSnapshot: {
          orderNumber: order.orderGroup?.orderNumber ?? null,
          documentNumber: order.documentNumber,
          documentName: order.name ?? null,
        },
      });
      await manager.delete(Order, id);
      return order;
    });
  }

  async removeGroup(id: number) {
    return this.transaction(async (manager) => {
      await this.claimGroup(manager, id);
      const group = await this.group(manager, id);
      await this.journal.record(manager, {
        orderGroupId: id,
        type: 'group_deleted',
        before: {
          status: group.status,
          dueDate: group.dueDate,
          customStatusId: group.customStatusId,
          customStatusName: group.customStatus?.name ?? null,
        },
        after: {},
        targetSnapshot: {
          orderNumber: group.orderNumber,
          documentNumber: null,
          documentName: null,
        },
      });
      // Preserve existing deletion semantics: documents become ungrouped.
      await manager
        .createQueryBuilder()
        .update(Order)
        .set({ managementVersion: () => '"managementVersion" + 1' })
        .where('"orderGroupId" = :id', { id })
        .execute();
      await manager.delete(OrderGroup, id);
      return group;
    });
  }
}
