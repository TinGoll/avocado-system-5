import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  AdjustAccrualDto,
  CancelAccrualDto,
  CreateManualAccrualDto,
  CreateOrderAccrualDto,
  SyncOrderAccrualDto,
} from './dto/accrual.dto';
import { FinanceAccrualsService } from './finance-accruals.service';
import { CancelPaymentDto, CreatePaymentDto } from './dto/payment.dto';
import { FinancePaymentsService } from './finance-payments.service';

@Controller('finance/accruals')
export class FinanceController {
  constructor(private readonly accruals: FinanceAccrualsService) {}

  @Post('from-order')
  createFromOrder(@Body() dto: CreateOrderAccrualDto) {
    return this.accruals.createFromOrder(dto);
  }

  @Post('manual')
  createManual(@Body() dto: CreateManualAccrualDto) {
    return this.accruals.createManual(dto);
  }

  @Post(':id/sync-order-total')
  syncOrderTotal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SyncOrderAccrualDto,
  ) {
    return this.accruals.syncOrderTotal(id, dto);
  }

  @Post(':id/adjustments')
  adjust(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustAccrualDto,
  ) {
    return this.accruals.adjust(id, dto);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelAccrualDto,
  ) {
    return this.accruals.cancel(id, dto);
  }
}

@Controller('finance/payments')
export class FinancePaymentsController {
  constructor(private readonly payments: FinancePaymentsService) {}

  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.payments.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.findOne(id);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelPaymentDto,
  ) {
    return this.payments.cancel(id, dto);
  }
}
