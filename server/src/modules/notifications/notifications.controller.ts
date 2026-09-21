import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  NotificationFeedQueryDto,
  ReadNotificationDto,
} from './dto/notification-feed.dto';
import {
  CreateNotificationRuleDto,
  PreviewNotificationRuleDto,
  UpdateNotificationRuleDto,
} from './dto/notification-rule.dto';
import { NotificationsService } from './notifications.service';
import { NotificationSchedulerService } from './notification-scheduler.service';

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

@Controller('notifications')
export class NotificationFeedController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly scheduler: NotificationSchedulerService,
  ) {}

  @Get()
  feed(@Query() query: NotificationFeedQueryDto) {
    return this.notifications.feed(query);
  }

  @Get('scheduler/status')
  schedulerStatus() {
    return this.scheduler.state();
  }

  @Patch(':id/read')
  read(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReadNotificationDto,
  ) {
    return this.notifications.setRead(id, dto);
  }
}
