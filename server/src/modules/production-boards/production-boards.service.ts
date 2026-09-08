import { runDatabaseTransaction } from '../database/database-transaction';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ProductionBoard } from './entities/production-board.entity';
import { ProductionStage } from './entities/production-stage.entity';
import { ProductionCard } from './entities/production-card.entity';
import { Order } from '../orders/entities/order.entity';
import {
  OrderGroup,
  OrderStatus,
} from '../order-groups/entities/order-group.entity';
import { OrderManagementEventService } from '../order-management/order-management-event.service';
import {
  AssignCardDto,
  CardsQueryDto,
  MoveCardDto,
  RemoveCardDto,
  TransferCardDto,
} from './dto/production-card.dto';
import {
  BoardVersionDto,
  CreateBoardDto,
  CreateStageDto,
  RemoveStageDto,
  ReorderStagesDto,
  StageDefinitionDto,
  UpdateBoardDto,
  UpdateStageDto,
} from './dto/production-board.dto';

@Injectable()
export class ProductionBoardsService {
  constructor(
    private readonly source: DataSource,
    private readonly journal: OrderManagementEventService,
  ) {}

  private transaction<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return runDatabaseTransaction(this.source, work);
  }

  private async board(manager: EntityManager, id: string) {
    const board = await manager.findOne(ProductionBoard, {
      where: { id },
      relations: { stages: true },
      order: { stages: { position: 'ASC', id: 'ASC' } },
    });
    if (!board) throw new NotFoundException('Production board not found');
    return board;
  }

  list() {
    return this.source.manager.find(ProductionBoard, {
      order: { name: 'ASC', id: 'ASC' },
    });
  }
  get(id: string) {
    return this.board(this.source.manager, id);
  }

  private validateStage(
    stage: Pick<StageDefinitionDto, 'kind' | 'progressPercent'>,
  ) {
    const { kind, progressPercent: progress } = stage;
    if (
      !Number.isInteger(progress) ||
      !(
        (kind === 'queue' && progress === 0) ||
        (kind === 'active' && progress >= 1 && progress <= 99) ||
        (kind === 'done' && progress === 100)
      )
    ) {
      throw new BadRequestException(
        'Progress must be queue: 0, active: 1–99, done: 100',
      );
    }
  }

  private validateBoard(board: ProductionBoard) {
    const active = board.stages.filter((stage) => !stage.archivedAt);
    active.forEach((stage) => this.validateStage(stage));
    if (
      !['queue', 'active', 'done'].every((kind) =>
        active.some((stage) => stage.kind === kind),
      )
    )
      throw new BadRequestException(
        'Board requires queue, active and done stages',
      );
    if (
      !active.some(
        (stage) =>
          stage.id === board.initialStageId &&
          stage.kind === 'queue' &&
          stage.boardId === board.id,
      )
    )
      throw new BadRequestException(
        'Initial stage must be an unarchived queue on this board',
      );
  }

  async create(dto: CreateBoardDto) {
    dto.stages.forEach((stage) => this.validateStage(stage));
    if (
      !dto.stages[dto.initialStageIndex] ||
      dto.stages[dto.initialStageIndex].kind !== 'queue'
    )
      throw new BadRequestException('Select an initial queue stage');
    return this.transaction(async (manager) => {
      const board = await manager.save(
        ProductionBoard,
        manager.create(ProductionBoard, {
          name: dto.name,
          description: dto.description ?? null,
          initialStageId: null,
          version: 0,
          archivedAt: null,
        }),
      );
      const stages = await manager.save(
        ProductionStage,
        dto.stages.map((stage, position) =>
          manager.create(ProductionStage, {
            ...stage,
            boardId: board.id,
            position,
            usedAt: null,
            archivedAt: null,
          }),
        ),
      );
      board.stages = stages;
      board.initialStageId = stages[dto.initialStageIndex].id;
      this.validateBoard(board);
      await manager.update(ProductionBoard, board.id, {
        initialStageId: board.initialStageId,
      });
      return this.board(manager, board.id);
    });
  }

  private async mutate(
    id: string,
    expectedVersion: number,
    change: (manager: EntityManager, board: ProductionBoard) => Promise<void>,
  ) {
    return this.transaction(async (manager) => {
      const claim = await manager
        .createQueryBuilder()
        .update(ProductionBoard)
        .set({ version: () => 'version + 1' })
        .where('id = :id AND version = :version', {
          id,
          version: expectedVersion,
        })
        .execute();
      if (!claim.affected) {
        if (!(await manager.existsBy(ProductionBoard, { id })))
          throw new NotFoundException('Production board not found');
        throw new ConflictException(
          'Production board changed; reload and retry',
        );
      }
      const board = await this.board(manager, id);
      if (board.archivedAt)
        throw new ConflictException('Archived boards cannot be changed');
      await change(manager, board);
      const updated = await this.board(manager, id);
      this.validateBoard(updated);
      return updated;
    });
  }

  update(id: string, dto: UpdateBoardDto) {
    return this.mutate(id, dto.expectedVersion, async (manager, board) => {
      if (
        dto.initialStageId !== undefined &&
        this.stage(board, dto.initialStageId).kind !== 'queue'
      )
        throw new BadRequestException('Initial stage must be a queue');
      const updates = {
        name: dto.name,
        description: dto.description,
        initialStageId: dto.initialStageId,
      };
      if (Object.values(updates).some((value) => value !== undefined))
        await manager.update(ProductionBoard, id, updates);
    });
  }

  archive(id: string, dto: BoardVersionDto) {
    return this.mutate(id, dto.expectedVersion, async (manager) => {
      const unfinished = await manager
        .createQueryBuilder(ProductionCard, 'card')
        .innerJoin(ProductionStage, 'stage', 'stage.id = card.stageId')
        .where('stage.boardId = :id', { id })
        .andWhere('stage.kind != :done', { done: 'done' })
        .getExists();
      if (unfinished) throw new ConflictException('Board has unfinished cards');
      await manager.update(ProductionBoard, id, { archivedAt: new Date() });
    });
  }

  addStage(id: string, dto: CreateStageDto) {
    this.validateStage(dto);
    return this.mutate(id, dto.expectedVersion, async (manager, board) => {
      const stage = {
        name: dto.name,
        color: dto.color,
        kind: dto.kind,
        progressPercent: dto.progressPercent,
      };
      await manager.save(
        ProductionStage,
        manager.create(ProductionStage, {
          ...stage,
          boardId: id,
          position: board.stages.filter((stage) => !stage.archivedAt).length,
          usedAt: null,
          archivedAt: null,
        }),
      );
    });
  }

  private stage(board: ProductionBoard, stageId: string) {
    const stage = board.stages.find((stage) => stage.id === stageId);
    if (!stage)
      throw new NotFoundException('Stage does not belong to this board');
    if (stage.archivedAt)
      throw new ConflictException('Archived stages cannot be changed');
    return stage;
  }

  updateStage(id: string, stageId: string, dto: UpdateStageDto) {
    return this.mutate(id, dto.expectedVersion, async (manager, board) => {
      const stage = this.stage(board, stageId);
      const kind = dto.kind ?? stage.kind;
      const progressPercent = dto.progressPercent ?? stage.progressPercent;
      if (
        stage.usedAt &&
        (kind !== stage.kind || progressPercent !== stage.progressPercent)
      )
        throw new ConflictException(
          'Used stage kind and progress are immutable',
        );
      this.validateStage({ kind, progressPercent });
      await manager.update(ProductionStage, stageId, {
        name: dto.name ?? stage.name,
        color: dto.color ?? stage.color,
        kind,
        progressPercent,
      });
    });
  }

  private async normalize(manager: EntityManager, stages: ProductionStage[]) {
    for (const [position, stage] of stages
      .filter((stage) => !stage.archivedAt)
      .entries()) {
      if (stage.position !== position)
        await manager.update(ProductionStage, stage.id, { position });
    }
  }

  removeStage(
    id: string,
    stageId: string,
    dto: RemoveStageDto,
    archive: boolean,
  ) {
    return this.mutate(id, dto.expectedVersion, async (manager, board) => {
      const stage = this.stage(board, stageId);
      if (!archive && stage.usedAt)
        throw new ConflictException('Used stages must be archived');
      if (await manager.existsBy(ProductionCard, { stageId }))
        throw new ConflictException('Move cards before removing this stage');
      // OM-08 checks enabled notification rules.
      if (dto.initialStageId !== undefined) {
        const replacement = this.stage(board, dto.initialStageId);
        if (replacement.id === stageId || replacement.kind !== 'queue')
          throw new BadRequestException(
            'Replacement must be another active queue',
          );
        await manager.update(ProductionBoard, id, {
          initialStageId: replacement.id,
        });
      } else if (board.initialStageId === stageId) {
        throw new BadRequestException('Select a replacement initial queue');
      }
      if (archive)
        await manager.update(ProductionStage, stageId, {
          archivedAt: new Date(),
        });
      else await manager.delete(ProductionStage, stageId);
      await this.normalize(
        manager,
        board.stages.filter((current) => current.id !== stageId),
      );
    });
  }

  reorder(id: string, dto: ReorderStagesDto) {
    return this.mutate(id, dto.expectedVersion, async (manager, board) => {
      const active = board.stages.filter((stage) => !stage.archivedAt);
      const ids = new Set(dto.stageIds);
      if (
        ids.size !== dto.stageIds.length ||
        ids.size !== active.length ||
        active.some((stage) => !ids.has(stage.id))
      )
        throw new BadRequestException(
          'stageIds must contain all unarchived stages exactly once',
        );
      for (const [position, stageId] of dto.stageIds.entries())
        await manager.update(ProductionStage, stageId, { position });
    });
  }

  private async claimGroup(
    manager: EntityManager,
    id: number,
    expectedVersion: number,
  ) {
    const result = await manager
      .createQueryBuilder()
      .update(OrderGroup)
      .set({ managementVersion: () => '"managementVersion" + 1' })
      .where('id = :id AND "managementVersion" = :expectedVersion', {
        id,
        expectedVersion,
      })
      .execute();
    if (!result.affected)
      throw new ConflictException('Order group changed; reload and retry');
    const group = await manager.findOneByOrFail(OrderGroup, { id });
    if ([OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(group.status))
      throw new ConflictException('Terminal order groups cannot be moved');
    return group;
  }

  private async claimBoard(
    manager: EntityManager,
    id: string,
    expectedVersion: number,
  ) {
    const result = await manager
      .createQueryBuilder()
      .update(ProductionBoard)
      .set({ version: () => 'version + 1' })
      .where('id = :id AND version = :expectedVersion', { id, expectedVersion })
      .execute();
    if (!result.affected)
      throw new ConflictException('Production board changed; reload and retry');
    const board = await this.board(manager, id);
    if (board.archivedAt)
      throw new ConflictException('Archived boards cannot be changed');
    return board;
  }

  private async orderForCard(manager: EntityManager, orderId: string) {
    const order = await manager.findOne(Order, {
      where: { id: orderId },
      loadEagerRelations: false,
      relations: { orderGroup: true, customStatus: true },
    });
    if (!order) throw new NotFoundException('Order document not found');
    if (!order.orderGroup)
      throw new BadRequestException('Document must belong to an order group');
    return order;
  }

  private async normalizeCards(manager: EntityManager, stageId: string) {
    const cards = await manager.find(ProductionCard, {
      where: { stageId },
      order: { position: 'ASC', id: 'ASC' },
    });
    for (const [position, card] of cards.entries())
      if (card.position !== position)
        await manager.update(ProductionCard, card.id, { position });
  }

  private async insertPosition(
    manager: EntityManager,
    stageId: string,
    beforeCardId?: string | null,
    excludedId?: string,
  ) {
    const cards = await manager.find(ProductionCard, {
      where: { stageId },
      order: { position: 'ASC', id: 'ASC' },
    });
    const filtered = cards.filter((card) => card.id !== excludedId);
    const index =
      beforeCardId == null
        ? filtered.length
        : filtered.findIndex((card) => card.id === beforeCardId);
    if (index < 0)
      throw new BadRequestException('beforeCardId is not in the target stage');
    filtered.splice(index, 0, {
      id: excludedId ?? '',
      position: -1,
    } as ProductionCard);
    for (const [position, card] of filtered.entries())
      if (card.id && card.position !== position)
        await manager.update(ProductionCard, card.id, { position });
    return index;
  }

  async assignCard(boardId: string, dto: AssignCardDto) {
    return this.transaction(async (manager) => {
      const order = await this.orderForCard(manager, dto.orderId);
      const group = await this.claimGroup(
        manager,
        order.orderGroup.id,
        dto.expectedGroupVersion,
      );
      const board = await this.claimBoard(
        manager,
        boardId,
        dto.expectedBoardVersion,
      );
      if (await manager.existsBy(ProductionCard, { orderId: order.id }))
        throw new ConflictException('Document already has a production card');
      const stage = this.stage(board, board.initialStageId!);
      if (stage.kind !== 'queue')
        throw new ConflictException('Initial stage must be a queue');
      const position = await manager.countBy(ProductionCard, {
        stageId: stage.id,
      });
      const card = await manager.save(
        ProductionCard,
        manager.create(ProductionCard, {
          orderId: order.id,
          stageId: stage.id,
          position,
          progressPercent: stage.progressPercent,
          enteredStageAt: new Date(),
          version: 0,
        }),
      );
      await manager.update(ProductionStage, stage.id, {
        usedAt: stage.usedAt ?? new Date(),
      });
      await this.journal.record(manager, {
        orderGroupId: group.id,
        orderId: order.id,
        type: 'board_assigned',
        before: {},
        after: {
          boardId,
          boardName: board.name,
          stageId: stage.id,
          stageName: stage.name,
        },
        targetSnapshot: {
          orderNumber: group.orderNumber,
          documentNumber: order.documentNumber,
          documentName: order.name ?? null,
        },
      });
      return card;
    });
  }

  private async relocate(
    id: string,
    dto: MoveCardDto | TransferCardDto,
    transfer: boolean,
  ) {
    return this.transaction(async (manager) => {
      const initial = await manager.findOne(ProductionCard, {
        where: { id },
        relations: { stage: true },
      });
      if (!initial) throw new NotFoundException('Production card not found');
      const order = await this.orderForCard(manager, initial.orderId);
      const group = await this.claimGroup(
        manager,
        order.orderGroup.id,
        dto.expectedGroupVersion,
      );
      const sourceBoardId = initial.stage.boardId;
      const targetBoardId = transfer
        ? (dto as TransferCardDto).targetBoardId
        : sourceBoardId;
      const boardIds = [...new Set([sourceBoardId, targetBoardId])].sort();
      const boards = new Map<string, ProductionBoard>();
      for (const boardId of boardIds) {
        const version =
          boardId === sourceBoardId
            ? dto.expectedBoardVersion
            : (dto as TransferCardDto).expectedTargetBoardVersion;
        boards.set(boardId, await this.claimBoard(manager, boardId, version));
      }
      const claimed = await manager
        .createQueryBuilder()
        .update(ProductionCard)
        .set({ version: () => 'version + 1' })
        .where('id = :id AND version = :version', {
          id,
          version: dto.expectedCardVersion,
        })
        .execute();
      if (!claimed.affected)
        throw new ConflictException(
          'Production card changed; reload and retry',
        );
      const targetBoard = boards.get(targetBoardId)!;
      const target = this.stage(targetBoard, dto.targetStageId);
      if (group.status === OrderStatus.DRAFT && target.kind !== 'queue')
        throw new ConflictException(
          'Draft documents can only be in queue stages',
        );
      const position = await this.insertPosition(
        manager,
        target.id,
        dto.beforeCardId,
        id,
      );
      const stageChanged = initial.stageId !== target.id;
      await manager.update(ProductionCard, id, {
        stageId: target.id,
        position,
        progressPercent: target.progressPercent,
        ...(stageChanged ? { enteredStageAt: new Date() } : {}),
      });
      if (stageChanged) {
        await manager.update(ProductionStage, target.id, {
          usedAt: target.usedAt ?? new Date(),
        });
        await this.journal.record(manager, {
          orderGroupId: group.id,
          orderId: order.id,
          type: transfer ? 'board_changed' : 'stage_changed',
          before: {
            boardId: sourceBoardId,
            stageId: initial.stageId,
            stageName: initial.stage.name,
            progressPercent: initial.progressPercent,
          },
          after: {
            boardId: targetBoardId,
            stageId: target.id,
            stageName: target.name,
            progressPercent: target.progressPercent,
          },
          targetSnapshot: {
            orderNumber: group.orderNumber,
            documentNumber: order.documentNumber,
            documentName: order.name ?? null,
          },
        });
      }
      await this.normalizeCards(manager, initial.stageId);
      await this.normalizeCards(manager, target.id);
      return manager.findOneByOrFail(ProductionCard, { id });
    });
  }

  moveCard(id: string, dto: MoveCardDto) {
    return this.relocate(id, dto, false);
  }

  transferCard(id: string, dto: TransferCardDto) {
    if (!dto.targetBoardId)
      throw new BadRequestException('targetBoardId is required');
    return this.relocate(id, dto, true);
  }

  async removeCard(id: string, dto: RemoveCardDto) {
    return this.transaction(async (manager) => {
      const card = await manager.findOne(ProductionCard, {
        where: { id },
        relations: { stage: true },
      });
      if (!card) throw new NotFoundException('Production card not found');
      const order = await this.orderForCard(manager, card.orderId);
      const group = await this.claimGroup(
        manager,
        order.orderGroup.id,
        dto.expectedGroupVersion,
      );
      const board = await this.claimBoard(
        manager,
        card.stage.boardId,
        dto.expectedBoardVersion,
      );
      if (card.version !== dto.expectedCardVersion)
        throw new ConflictException(
          'Production card changed; reload and retry',
        );
      await manager.delete(ProductionCard, id);
      await this.normalizeCards(manager, card.stageId);
      await this.journal.record(manager, {
        orderGroupId: group.id,
        orderId: order.id,
        type: 'board_removed',
        before: {
          boardId: board.id,
          boardName: board.name,
          stageId: card.stageId,
          stageName: card.stage.name,
        },
        after: {},
        targetSnapshot: {
          orderNumber: group.orderNumber,
          documentNumber: order.documentNumber,
          documentName: order.name ?? null,
        },
      });
      return { id };
    });
  }

  async listCards(boardId: string, query: CardsQueryDto) {
    await this.get(boardId);
    let cursor: [number, string] | null = null;
    if (query.cursor) {
      try {
        cursor = JSON.parse(
          Buffer.from(query.cursor, 'base64url').toString(),
        ) as [number, string];
      } catch {
        throw new BadRequestException('Invalid cursor');
      }
    }
    const qb = this.source.manager
      .createQueryBuilder(ProductionCard, 'card')
      .innerJoin(ProductionStage, 'stage', 'stage.id = card.stageId')
      .innerJoin(Order, 'orders', 'orders.id = card.orderId')
      .innerJoin(OrderGroup, 'groups', 'groups.id = orders.orderGroupId')
      .leftJoin(
        'custom_order_statuses',
        'status',
        'status.id = orders.customStatusId',
      )
      .select([
        'card.id AS id',
        'card.orderId AS "orderId"',
        'card.stageId AS "stageId"',
        'card.position AS position',
        'card.progressPercent AS "progressPercent"',
        'card.enteredStageAt AS "enteredStageAt"',
        'card.version AS version',
        'orders.name AS "documentName"',
        'orders.documentNumber AS "documentNumber"',
        'orders.managementVersion AS "documentVersion"',
        'COALESCE(orders.dueDate, groups.dueDate) AS "effectiveDueDate"',
        'orders.customStatusId AS "customStatusId"',
        'status.name AS "customStatusName"',
        'groups.id AS "orderGroupId"',
        'groups.orderNumber AS "orderNumber"',
        'groups.managementVersion AS "groupVersion"',
      ])
      .where('stage.boardId = :boardId', { boardId })
      .andWhere(query.stageId ? 'card.stageId = :stageId' : '1 = 1', {
        stageId: query.stageId,
      })
      .orderBy('card.position', 'ASC')
      .addOrderBy('card.id', 'ASC')
      .limit(query.limit + 1);
    if (cursor)
      qb.andWhere(
        '(card.position > :position OR (card.position = :position AND card.id > :cursorId))',
        { position: cursor[0], cursorId: cursor[1] },
      );
    const rows = await qb.getRawMany<Record<string, unknown>>();
    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit);
    const last = items.at(-1);
    return {
      items,
      meta: {
        nextCursor:
          hasMore && last
            ? Buffer.from(
                JSON.stringify([Number(last.position), last.id]),
              ).toString('base64url')
            : null,
      },
    };
  }

  async groupProduction(groupId: number) {
    if (!(await this.source.manager.existsBy(OrderGroup, { id: groupId })))
      throw new NotFoundException('Order group not found');
    const rows = await this.source.manager
      .createQueryBuilder(Order, 'orders')
      .leftJoin(ProductionCard, 'card', 'card.orderId = orders.id')
      .leftJoin(ProductionStage, 'stage', 'stage.id = card.stageId')
      .leftJoin(ProductionBoard, 'board', 'board.id = stage.boardId')
      .select([
        'orders.id AS id',
        'orders.name AS name',
        'orders.documentNumber AS "documentNumber"',
        'COALESCE(card.progressPercent, 0) AS "progressPercent"',
        'card.id AS "cardId"',
        'card.version AS "cardVersion"',
        'stage.id AS "stageId"',
        'stage.name AS "stageName"',
        'stage.kind AS "stageKind"',
        'board.id AS "boardId"',
        'board.name AS "boardName"',
      ])
      .where('orders.orderGroupId = :groupId', { groupId })
      .orderBy('orders.documentNumber', 'ASC')
      .getRawMany<Record<string, unknown>>();
    const trackedCount = rows.filter((row) => row.cardId).length;
    return {
      documents: rows,
      progressPercent: rows.length
        ? rows.reduce((sum, row) => sum + Number(row.progressPercent), 0) /
          rows.length
        : null,
      documentCount: rows.length,
      trackedCount,
      productionComplete:
        rows.length > 0 && rows.every((row) => row.stageKind === 'done'),
    };
  }
}
