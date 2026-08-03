import { useParams } from 'react-router';

export const useCurrentOrderGroupID = () => {
  const { groupID } = useParams<{ groupID?: string }>();
  return { groupID: groupID ? Number(groupID) : null };
};
