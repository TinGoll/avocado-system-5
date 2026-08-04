import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer, CustomerLevel } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { validate } from 'class-validator';

describe('CustomersController', () => {
  let controller: CustomersController;
  let service: jest.Mocked<Pick<CustomersService, 'findAll'>>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [{ provide: CustomersService, useValue: service }],
    }).compile();

    controller = module.get(CustomersController);
  });

  it('returns customers with supported levels', async () => {
    const customers: Customer[] = [
      {
        id: 'customer-1',
        name: 'Bronze customer',
        level: CustomerLevel.BRONZE,
      },
      {
        id: 'customer-2',
        name: 'Silver customer',
        level: CustomerLevel.SILVER,
      },
      { id: 'customer-3', name: 'Gold customer', level: CustomerLevel.GOLD },
    ];
    service.findAll.mockResolvedValue(customers);

    await expect(controller.findAll()).resolves.toEqual(customers);
    expect(service.findAll).toHaveBeenCalledTimes(1);
  });

  it('rejects an unsupported customer level', async () => {
    const dto = new CreateCustomerDto();
    dto.name = 'Unsupported customer';
    dto.level = 'platinum' as CustomerLevel;

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'level' })]),
    );
  });
});
