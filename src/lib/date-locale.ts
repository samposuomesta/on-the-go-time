import { fi, enUS } from 'date-fns/locale';
import type { Language } from '@/lib/i18n';

export function getDateLocale(language: Language) {
  return language === 'fi' ? fi : enUS;
}
