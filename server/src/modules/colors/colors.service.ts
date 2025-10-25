import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Color } from './entities/color.entity';

@Injectable()
export class ColorsService {
  constructor(
    @InjectRepository(Color)
    private readonly repository: Repository<Color>,
  ) {}

  create(createDto: CreateColorDto): Promise<Color> {
    const item = this.repository.create(createDto);
    return this.repository.save(item);
  }

  findAll(): Promise<Color[]> {
    return this.repository.find();
  }

  async findOne(id: string): Promise<Color> {
    const item = await this.repository.findOneBy({ id });
    if (!item) {
      throw new NotFoundException(`Color with ID "${id}" not found`);
    }
    return item;
  }

  async update(id: string, updateDto: UpdateColorDto): Promise<Color> {
    const item = await this.repository.preload({
      id,
      ...updateDto,
    });
    if (!item) {
      throw new NotFoundException(`Color with ID "${id}" not found`);
    }
    return this.repository.save(item);
  }

  async remove(id: string): Promise<Color> {
    const item = await this.findOne(id);
    await this.repository.remove(item);
    return item;
  }
}
