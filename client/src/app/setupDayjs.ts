import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Europe/Moscow');

// eslint-disable-next-line no-console
console.log('[dayjs] Timezone set to Europe/Moscow');

export default dayjs;
