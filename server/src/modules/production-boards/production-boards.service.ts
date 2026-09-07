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
  constructor(private readonly source: DataSource) {}

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
    // OM-04 adds the check for unfinished cards here.
    return this.mutate(id, dto.expectedVersion, async (manager) => {
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
      // OM-04 checks active cards, OM-08 checks enabled notification rules.
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
}
