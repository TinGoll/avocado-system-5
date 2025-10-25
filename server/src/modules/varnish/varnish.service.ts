import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateVarnishDto } from './dto/create-varnish.dto';
import { UpdateVarnishDto } from './dto/update-varnish.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Varnish } from './entities/varnish.entity';
import { Repository } from 'typeorm';

@Injectable()
export class VarnishService {
  constructor(
    @InjectRepository(Varnish)
    private readonly repository: Repository<Varnish>,
  ) {}

  create(createDto: CreateVarnishDto) {
    const item = this.repository.create(createDto);
    return this.repository.save(item);
  }

  findAll() {
    return this.repository.find();
  }

  async findOne(id: string) {
    const item = await this.repository.findOneBy({ id });
    if (!item) {
      throw new NotFoundException(`Varnish with ID "${id}" not found`);
    }
    return item;
  }

  async update(id: string, updateDto: UpdateVarnishDto) {
    const item = await this.repository.preload({
      id,
      ...updateDto,
    });
    if (!item) {
      throw new NotFoundException(`Varnish with ID "${id}" not found`);
    }
    return this.repository.save(item);
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    await this.repository.remove(item);
    return item;
  }
}
