import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateNotificationRuleDto,
  PreviewNotificationRuleDto,
  UpdateNotificationRuleDto,
} from './dto/notification-rule.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications/rules')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list() {
    return this.notifications.list();
  }

  @Post()
  create(@Body() dto: CreateNotificationRuleDto) {
    return this.notifications.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationRuleDto,
  ) {
    return this.notifications.update(id, dto);
  }

  @Post('preview')
  preview(@Body() dto: PreviewNotificationRuleDto) {
    return this.notifications.preview(dto);
  }
}
