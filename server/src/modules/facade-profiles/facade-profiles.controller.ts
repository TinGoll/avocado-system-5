import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { FacadeProfilesService } from './facade-profiles.service';
import { CreateFacadeProfileDto } from './dto/create-facade-profile.dto';
import { UpdateFacadeProfileDto } from './dto/update-facade-profile.dto';

@Controller('facade-profiles')
export class FacadeProfilesController {
  constructor(private readonly facadeProfilesService: FacadeProfilesService) {}

  @Post()
  create(@Body() createFacadeProfileDto: CreateFacadeProfileDto) {
    return this.facadeProfilesService.create(createFacadeProfileDto);
  }

  @Get()
  findAll() {
    return this.facadeProfilesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.facadeProfilesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFacadeProfileDto: UpdateFacadeProfileDto,
  ) {
    return this.facadeProfilesService.update(id, updateFacadeProfileDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.facadeProfilesService.remove(id);
  }
}
