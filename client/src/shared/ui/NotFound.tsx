import { Button, Result } from 'antd';
import { type FC } from 'react';
import { useNavigate } from 'react-router';

type Props = {
  groupID?: string | null;
};

export const NotFound: FC<Props> = ({ groupID }) => {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="404"
      subTitle={`Хм... Заказ № ${groupID} не найден, но ты можешь создать новый или перейти на главную страницу.`}
      extra={
        <Button
          onClick={() => {
            navigate('/');
          }}
          type="primary"
        >
          На главную страницу
        </Button>
      }
    />
  );
};
