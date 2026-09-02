export const formatOrderPrintNumber = (
  groupID: number,
  documentNumber: number,
  documentCount: number,
): string =>
  `№ ${groupID}${documentCount > 1 ? `/${documentNumber} (${documentCount})` : ''}`;
