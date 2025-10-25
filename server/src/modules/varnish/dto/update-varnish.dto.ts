import { PartialType } from '@nestjs/mapped-types';
import { CreateVarnishDto } from './create-varnish.dto';

export class UpdateVarnishDto extends PartialType(CreateVarnishDto) {}
