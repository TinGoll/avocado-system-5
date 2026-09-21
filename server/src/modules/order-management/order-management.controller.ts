import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrderManagementService } from './order-management.service';
import {
  CreateCustomStatusDto,
  CustomStatusQueryDto,
  ManagementHistoryQueryDto,
  UpdateCustomStatusDto,
  UpdateDocumentManagementDto,
  UpdateGroupManagementDto,
  UpdateManagementSettingsDto,
} from './dto/management.dto';

@Controller('order-management')
export class OrderManagementController {
  constructor(private readonly management: OrderManagementService) {}

  @Get('statuses')
  statuses(@Query() query: CustomStatusQueryDto) {
    return this.management.listStatuses(query);
  }

  @Post('statuses')
  createStatus(@Body() dto: CreateCustomStatusDto) {
    return this.management.createStatus(dto);
  }

  @Patch('statuses/:id')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomStatusDto,
  ) {
    return this.management.updateStatus(id, dto);
  }

  @Post('statuses/:id/archive')
  archiveStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.management.archiveStatus(id);
  }

  @Delete('statuses/:id')
  deleteStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.management.deleteStatus(id);
  }

  @Get('settings')
  settings() {
    return this.management.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateManagementSettingsDto) {
    return this.management.updateSettings(dto);
  }

  @Get('history')
  history(@Query() query: ManagementHistoryQueryDto) {
    return this.management.history(query);
  }
}

@Controller('order-groups')
export class OrderGroupManagementController {
  constructor(private readonly management: OrderManagementService) {}

  @Get(':id/management')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.management.getGroup(id);
  }

  @Patch(':id/management')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGroupManagementDto,
  ) {
    return this.management.updateGroup(id, dto);
  }
}

@Controller('orders')
export class OrderDocumentManagementController {
  constructor(private readonly management: OrderManagementService) {}

  @Get(':id/management')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.management.getDocument(id);
  }

  @Patch(':id/management')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentManagementDto,
  ) {
    return this.management.updateDocument(id, dto);
  }
}
