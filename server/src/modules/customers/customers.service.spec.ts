import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CustomersService } from './customers.service';
import { Customer, CustomerLevel } from './entities/customer.entity';
import type { OrderGroup } from '../order-groups/entities/order-group.entity';

describe('CustomersService', () => {
  let repository: jest.Mocked<Repository<Customer>>;
  let service: CustomersService;
  let preload: jest.Mock;
  let save: jest.Mock;
  let remove: jest.Mock;
  let orderGroupRepository: jest.Mocked<Repository<OrderGroup>>;

  beforeEach(() => {
    preload = jest.fn();
    save = jest.fn();
    remove = jest.fn();
    repository = {
      create: jest.fn(),
      save,
      preload,
      findOneBy: jest.fn(),
      remove,
    } as unknown as jest.Mocked<Repository<Customer>>;
    orderGroupRepository = {
      existsBy: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<Repository<OrderGroup>>;
    service = new CustomersService(repository, orderGroupRepository);
  });

  it('updates and saves an existing customer', async () => {
    const customer: Customer = {
      id: '8c54a536-3c04-4f1a-b914-458b98bf47ee',
      name: 'Премиум клиент',
      attributes: {},
      level: CustomerLevel.GOLD,
    };
    preload.mockResolvedValue(customer);
    save.mockResolvedValue(customer);

    await expect(
      service.update(customer.id, { level: CustomerLevel.GOLD }),
    ).resolves.toEqual(customer);
    expect(preload).toHaveBeenCalledWith({
      id: customer.id,
      level: CustomerLevel.GOLD,
    });
    expect(save).toHaveBeenCalledWith(customer);
  });

  it('returns 404 when the customer to update does not exist', async () => {
    preload.mockResolvedValue(undefined);

    await expect(
      service.update('d8c2b2f0-0c0a-4e43-a75e-af61a69ba868', {
        name: 'Новый клиент',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(save).not.toHaveBeenCalled();
  });

  it('returns 409 instead of deleting a referenced customer', async () => {
    const customer: Customer = {
      id: '8c54a536-3c04-4f1a-b914-458b98bf47ee',
      name: 'Связанный клиент',
      attributes: {},
      level: CustomerLevel.GOLD,
    };
    repository.findOneBy.mockResolvedValue(customer);
    orderGroupRepository.existsBy.mockResolvedValue(true);

    await expect(service.remove(customer.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(remove).not.toHaveBeenCalled();
  });
});
