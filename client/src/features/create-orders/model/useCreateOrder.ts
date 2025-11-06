import {
  ORDER_STATUS,
  useOrderGroupMutations,
  useOrdersMutations,
  useOrderStore,
  type Order,
  type OrderGroup,
} from '@entities/order';

type OrderGroupCreateDTO = {
  orderNumber: string;
  customer: OrderGroup['customer'];
  startedAt?: Date;
  characteristics: Order['characteristics'];
};

export const useCreateOrder = () => {
  const { create: createGroup } = useOrderGroupMutations();
  const { create: createOrder } = useOrdersMutations();
  const { setCreating } = useOrderStore();

  const handleCreate = async (formValues: OrderGroupCreateDTO) => {
    try {
      setCreating(true);

      const group = await createGroup.trigger({
        customer: formValues.customer,
        startedAt: formValues.startedAt,
        status: ORDER_STATUS.DRAFT,
        orderNumber: formValues.orderNumber,
      });

      // setCurrentGroup(group);

      const order = await createOrder.trigger({
        orderGroupId: group.id,
        items: [],
        characteristics: formValues.characteristics,
      });

      // setCurrentOrder(order);

      return { group, order };
    } finally {
      setCreating(false);
    }
  };

  return { handleCreate };
};
