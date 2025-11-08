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

  findAll() {
    return this.repository.find();
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

  async findOrderIds(groupId: number): Promise<string[]> {
    const groupExists = await this.repository.existsBy({ id: groupId });
    if (!groupExists) {
      throw new NotFoundException(`Order Group with ID "${groupId}" not found`);
    }

    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.id', 'id')
      .where('order.orderGroupId = :groupId', { groupId })
      .getRawMany<Order>();

    return orders.map((order) => order.id);
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
