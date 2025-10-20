import { Injectable } from '@nestjs/common';
import { CreateModifierDto } from './dto/create-modifier.dto';
import { UpdateModifierDto } from './dto/update-modifier.dto';

@Injectable()
export class ModifiersService {
  create(createModifierDto: CreateModifierDto) {
    return 'This action adds a new modifier';
  }

  findAll() {
    return `This action returns all modifiers`;
  }

  findOne(id: number) {
    return `This action returns a #${id} modifier`;
  }

  update(id: number, updateModifierDto: UpdateModifierDto) {
    return `This action updates a #${id} modifier`;
  }

  remove(id: number) {
    return `This action removes a #${id} modifier`;
  }
}
