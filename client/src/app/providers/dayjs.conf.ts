import 'dayjs/locale/ru';

import dayjs, { type Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc';

dayjs.locale('ru');
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(updateLocale);

dayjs.updateLocale('ru', {
  relativeTime: {
    future: 'через %s',
    past: '%s назад',
    s: 'несколько сек',
    m: '1мин',
    mm: '%dмин',
    h: '1ч',
    hh: '%dч',
    d: '1д',
    dd: '%dд',
    M: '1м',
    MM: '%dм',
    y: '1г',
    yy: '%dг',
  },
});

export const initializeDayjsConf = (): Dayjs => dayjs();
