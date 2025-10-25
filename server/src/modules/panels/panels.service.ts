import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePanelDto } from './dto/create-panel.dto';
import { UpdatePanelDto } from './dto/update-panel.dto';
import { Panel } from './entities/panel.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class PanelsService {
  constructor(
    @InjectRepository(Panel)
    private readonly repository: Repository<Panel>,
  ) {}

  create(createDto: CreatePanelDto) {
    const item = this.repository.create(createDto);
    return this.repository.save(item);
  }

  findAll() {
    return this.repository.find();
  }

  async findOne(id: string) {
    const item = await this.repository.findOneBy({ id });
    if (!item) {
      throw new NotFoundException(`Panel with ID "${id}" not found`);
    }
    return item;
  }

  async update(id: string, updateDto: UpdatePanelDto) {
    const item = await this.repository.preload({
      id,
      ...updateDto,
    });
    if (!item) {
      throw new NotFoundException(`Color with ID "${id}" not found`);
    }
    return this.repository.save(item);
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    await this.repository.remove(item);
    return item;
  }
}
