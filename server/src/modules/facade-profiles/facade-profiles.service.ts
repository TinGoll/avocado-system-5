import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFacadeProfileDto } from './dto/create-facade-profile.dto';
import { UpdateFacadeProfileDto } from './dto/update-facade-profile.dto';
import { FacadeProfile } from './entities/facade-profile.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class FacadeProfilesService {
  constructor(
    @InjectRepository(FacadeProfile)
    private readonly repository: Repository<FacadeProfile>,
  ) {}

  create(createDto: CreateFacadeProfileDto): Promise<FacadeProfile> {
    const item = this.repository.create(createDto);
    return this.repository.save(item);
  }

  findAll(): Promise<FacadeProfile[]> {
    return this.repository.find();
  }

  async findOne(id: string): Promise<FacadeProfile> {
    const item = await this.repository.findOneBy({ id });
    if (!item) {
      throw new NotFoundException(`Facade Profile with ID "${id}" not found`);
    }
    return item;
  }

  async update(
    id: string,
    updateDto: UpdateFacadeProfileDto,
  ): Promise<FacadeProfile> {
    const item = await this.repository.preload({
      id,
      ...updateDto,
    });
    if (!item) {
      throw new NotFoundException(`Facade Profile with ID "${id}" not found`);
    }
    return this.repository.save(item);
  }

  async remove(id: string): Promise<FacadeProfile> {
    const item = await this.findOne(id);
    await this.repository.remove(item);
    return item;
  }
}
