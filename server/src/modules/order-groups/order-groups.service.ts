import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderGroupDto } from './dto/create-order-group.dto';
import { UpdateOrderGroupDto } from './dto/update-order-group.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderGroup } from './entities/order-group.entity';

@Injectable()
export class OrderGroupsService {
  constructor(
    @InjectRepository(OrderGroup)
    private readonly repository: Repository<OrderGroup>,
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

  async update(id: number, updateDto: UpdateOrderGroupDto) {
    const item = await this.repository.preload({
      id,
      ...updateDto,
    });
    if (!item) {
      throw new NotFoundException(`Material with ID "${id}" not found`);
    }
    return this.repository.save(item);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    await this.repository.remove(item);
    return item;
  }
}
