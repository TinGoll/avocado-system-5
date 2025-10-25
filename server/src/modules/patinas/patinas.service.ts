import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePatinaDto } from './dto/create-patina.dto';
import { UpdatePatinaDto } from './dto/update-patina.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patina } from './entities/patina.entity';

@Injectable()
export class PatinasService {
  constructor(
    @InjectRepository(Patina)
    private readonly repository: Repository<Patina>,
  ) {}

  create(createDto: CreatePatinaDto) {
    const item = this.repository.create(createDto);
    return this.repository.save(item);
  }

  findAll() {
    return this.repository.find();
  }

  async findOne(id: string) {
    const item = await this.repository.findOneBy({ id });
    if (!item) {
      throw new NotFoundException(`Patina with ID "${id}" not found`);
    }
    return item;
  }

  async update(id: string, updateDto: UpdatePatinaDto) {
    const item = await this.repository.preload({
      id,
      ...updateDto,
    });
    if (!item) {
      throw new NotFoundException(`Patina with ID "${id}" not found`);
    }
    return this.repository.save(item);
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    await this.repository.remove(item);
    return item;
  }
}
