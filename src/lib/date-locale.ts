import { fi, enUS } from 'date-fns/locale';
import { useTranslation, type Language } from '@/lib/i18n';

export function getDateLocale(language: Language) {
  return language === 'fi' ? fi : enUS;
}

export function useDateLocale() {
  const { language } = useTranslation();
  return getDateLocale(language);
}
