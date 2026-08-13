import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateClientErrorDto } from './dto/create-client-error.dto';
import { ClientError } from './entities/client-error.entity';

@Injectable()
export class ClientErrorsService {
  constructor(
    @InjectRepository(ClientError)
    private readonly repository: Repository<ClientError>,
  ) {}

  create(dto: CreateClientErrorDto): Promise<ClientError> {
    return this.repository.save(this.repository.create(dto));
  }
}
