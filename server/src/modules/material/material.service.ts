import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { Material } from './entities/material.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class MaterialService {
  constructor(
    @InjectRepository(Material)
    private readonly repository: Repository<Material>,
  ) {}

  create(createDto: CreateMaterialDto) {
    const item = this.repository.create(createDto);
    return this.repository.save(item);
  }

  findAll() {
    return this.repository.find();
  }

  async findOne(id: string) {
    const item = await this.repository.findOneBy({ id });
    if (!item) {
      throw new NotFoundException(`Material with ID "${id}" not found`);
    }
    return item;
  }

  async update(id: string, updateDto: UpdateMaterialDto) {
    const item = await this.repository.preload({
      id,
      ...updateDto,
    });
    if (!item) {
      throw new NotFoundException(`Material with ID "${id}" not found`);
    }
    return this.repository.save(item);
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    await this.repository.remove(item);
    return item;
  }
}
