import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderGroupDto } from './dto/create-order-group.dto';
import { UpdateOrderGroupDto } from './dto/update-order-group.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderGroup } from './entities/order-group.entity';
import { Order } from '../orders/entities/order.entity';

@Injectable()
export class OrderGroupsService {
  constructor(
    @InjectRepository(OrderGroup)
    private readonly repository: Repository<OrderGroup>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  create(createDto: CreateOrderGroupDto) {
    const item = this.repository.create(createDto);
    return this.repository.save(item);
  }

  async findAll() {
    const groups = await this.repository.find({
      relations: {
        orders: {
          items: true,
        },
      },
      order: {
        createdAt: 'DESC',
        orders: {
          createdAt: 'ASC',
        },
      },
    });

    return groups.map((group) => ({
      ...group,
      orderCount: group.orders.length,
    }));
  }

  async search(query: string, limit: number) {
    const term = query.trim().toLocaleLowerCase('ru-RU');
    const isPostgres =
      this.repository.manager.connection.options.type === 'postgres';
    const matchOperator = isPostgres ? 'ILIKE' : 'LIKE';
    const normalize = isPostgres ? 'lower' : 'unicode_lower';
    const groupText = isPostgres
      ? `coalesce(group_entity."orderNumber", '') || ' ' || coalesce(group_entity.customer::text, '') || ' ' || coalesce(group_entity.comment, '')`
      : `coalesce(group_entity."orderNumber", '') || ' ' || coalesce(group_entity.customer, '') || ' ' || coalesce(group_entity.comment, '')`;
    const orderText = isPostgres
      ? `coalesce(order_entity.name, '') || ' ' || coalesce(order_entity.comment, '') || ' ' || coalesce(order_entity.characteristics::text, '') || ' ' || coalesce(order_entity."totalPrice"::text, '')`
      : `coalesce(order_entity.name, '') || ' ' || coalesce(order_entity.comment, '') || ' ' || coalesce(order_entity.characteristics, '') || ' ' || cast(order_entity."totalPrice" as text)`;
    const itemText = isPostgres
      ? `coalesce(item.snapshot::text, '') || ' ' || coalesce(item.characteristics::text, '') || ' ' || coalesce(item.quantity::text, '')`
      : `coalesce(item.snapshot, '') || ' ' || coalesce(item.characteristics, '') || ' ' || cast(item.quantity as text)`;

    return this.repository
      .createQueryBuilder('group_entity')
      .leftJoinAndSelect('group_entity.orders', 'orders')
      .leftJoinAndSelect('orders.items', 'items')
      .where(`${normalize}(${groupText}) ${matchOperator} :term`, {
        term: `%${term}%`,
      })
      .orWhere(
        `EXISTS (SELECT 1 FROM orders order_entity WHERE order_entity."orderGroupId" = group_entity.id AND ${normalize}(${orderText}) ${matchOperator} :term)`,
      )
      .orWhere(
        `EXISTS (SELECT 1 FROM orders order_entity JOIN order_items item ON item."orderId" = order_entity.id WHERE order_entity."orderGroupId" = group_entity.id AND ${normalize}(${itemText}) ${matchOperator} :term)`,
      )
      .orderBy('group_entity.updatedAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async findOne(id: number) {
    const item = await this.repository.findOneBy({ id });
    if (!item) {
      throw new NotFoundException(`Order Group with ID "${id}" not found`);
    }
    return item;
  }

  async findOneWithOrderIds(
    id: number,
  ): Promise<Omit<OrderGroup, 'orders'> & { orderIds: string[] }> {
    const item = await this.repository.findOne({
      where: { id },
      relations: ['orders'],
    });

    if (!item) {
      throw new NotFoundException(`Order Group with ID "${id}" not found`);
    }

    const orderIds = item.orders.map((order) => order.id);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { orders: _, ...rest } = item;

    return {
      ...rest,
      orderIds,
    };
  }

  async findOrderIds(
    groupId: number,
  ): Promise<{ id: string; name?: string; totalPrice: number }[]> {
    const groupExists = await this.repository.existsBy({ id: groupId });
    if (!groupExists) {
      throw new NotFoundException(`Order Group with ID "${groupId}" not found`);
    }

    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.id', 'id')
      .addSelect('order.name', 'name')
      .addSelect('order.totalPrice', 'totalPrice')
      .where('order.orderGroupId = :groupId', { groupId })
      .getRawMany<Order>();

    return orders.map((order) => ({
      id: order.id,
      name: order.name,
      totalPrice: Number(order.totalPrice) || 0,
    }));
  }

  async update(id: number, updateDto: UpdateOrderGroupDto) {
    const item = await this.repository.preload({
      id,
      ...updateDto,
    });
    if (!item) {
      throw new NotFoundException(`Order Group with ID "${id}" not found`);
    }
    return this.repository.save(item);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    await this.repository.remove(item);
    return item;
  }
}
