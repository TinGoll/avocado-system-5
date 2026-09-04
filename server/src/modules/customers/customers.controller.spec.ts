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
        attributes: {},
        level: CustomerLevel.BRONZE,
      },
      {
        id: 'customer-2',
        name: 'Silver customer',
        attributes: {},
        level: CustomerLevel.SILVER,
      },
      {
        id: 'customer-3',
        name: 'Gold customer',
        attributes: {},
        level: CustomerLevel.GOLD,
      },
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

  it('accepts optional customer details and validates email', async () => {
    const dto = new CreateCustomerDto();
    dto.name = 'Customer with details';
    dto.level = CustomerLevel.GOLD;
    dto.companyName = 'Avocado LLC';
    dto.address = 'Moscow';
    dto.phone = '+7 999 123-45-67';
    dto.email = 'customer@example.com';
    dto.comment = 'Preferred customer';
    dto.attributes = { source: 'website', ordersCount: 3, isPartner: true };

    await expect(validate(dto)).resolves.toHaveLength(0);

    dto.email = 'invalid-email';
    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'email' })]),
    );
  });

  it('rejects a non-object customer attributes value', async () => {
    const dto = new CreateCustomerDto();
    dto.name = 'Customer with invalid attributes';
    dto.level = CustomerLevel.BRONZE;
    dto.attributes = [] as unknown as Record<
      string,
      string | number | boolean
    >;

    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'attributes' }),
      ]),
    );
  });
});
