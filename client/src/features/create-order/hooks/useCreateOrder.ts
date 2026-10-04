import {
  useOrderGroupMutations,
  useOrdersMutations,
  useOrderStore,
  type Order,
  type OrderGroup,
} from '@entities/order';

type OrderGroupCreateDTO = {
  orderNumber: string;
  customerId?: string;
  comment?: OrderGroup['comment'];
  startedAt?: Date;
  characteristics: Order['characteristics'];
};

export const createOrderGroupPayload = (formValues: OrderGroupCreateDTO) => ({
  customerId: formValues.customerId,
  startedAt: formValues.startedAt,
  orderNumber: formValues.orderNumber,
  comment: formValues.comment,
});

export const useCreateOrder = () => {
  const { create: createGroup } = useOrderGroupMutations();
  const { create: createOrder } = useOrdersMutations();
  const { setCreating } = useOrderStore();

  const handleCreate = async (formValues: OrderGroupCreateDTO) => {
    try {
      setCreating(true);

      const group = await createGroup.trigger(
        createOrderGroupPayload(formValues),
      );

      const order = await createOrder.trigger({
        orderGroupId: group.id,
        items: [],
        characteristics: formValues.characteristics,
      });

      return { group, order };
    } finally {
      setCreating(false);
    }
  };

  return { handleCreate };
};
