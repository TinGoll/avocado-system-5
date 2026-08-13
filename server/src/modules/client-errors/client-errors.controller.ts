import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ClientErrorsService } from './client-errors.service';
import { CreateClientErrorDto } from './dto/create-client-error.dto';

@Controller('client-errors')
export class ClientErrorsController {
  constructor(private readonly clientErrorsService: ClientErrorsService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async create(@Body() dto: CreateClientErrorDto): Promise<void> {
    await this.clientErrorsService.create(dto);
  }
}
