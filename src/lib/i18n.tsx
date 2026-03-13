import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'fi';

const translations = {
  en: {
    // Settings
    'settings.title': 'Settings',
    'settings.appearance': 'Appearance',
    'settings.language': 'Language',
    'settings.about': 'About',
    'settings.version': 'Version',
    'settings.platform': 'Platform',
    'settings.offline': 'Offline',
    'settings.enabled': 'Enabled',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',
    'lang.en': 'English',
    'lang.fi': 'Suomi',

    // Dashboard
    'dashboard.clockIn': 'Clock In',
    'dashboard.clockOut': 'Clock Out',
    'dashboard.sickLeave': 'Sick Leave',
    'dashboard.absence': 'Absence',
    'dashboard.today': 'Today',
    'dashboard.workHours': 'Work Hours',

    // Admin
    'admin.title': 'Admin Panel',
    'admin.statistics': 'Statistics',
    'admin.approvals': 'Approvals',
    'admin.vacationApprovals': 'Vacation Approvals',
    'admin.absences': 'Absences',
    'admin.projects': 'Projects',
    'admin.workplaces': 'GPS Workplaces',
    'admin.reminders': 'Reminders',
    'admin.employees': 'Employees',
    'admin.companies': 'Companies',
    'admin.audit': 'Audit Trail',
    'admin.statisticsDesc': 'Overview & metrics',
    'admin.approvalsDesc': 'Travel & project hours',
    'admin.vacationApprovalsDesc': 'Review vacation requests',
    'admin.absencesDesc': 'Sick leave & absences',
    'admin.projectsDesc': 'Manage projects',
    'admin.workplacesDesc': 'Geofence locations',
    'admin.remindersDesc': 'Notification rules',
    'admin.employeesDesc': 'Manage team members',
    'admin.companiesDesc': 'Company settings',
    'admin.auditDesc': 'Change history',

    // Absence reasons
    'absenceReasons.title': 'Absence Reasons',
    'absenceReasons.description': 'Custom reasons employees can select when marking absence',
    'absenceReasons.add': 'Add Reason',
    'absenceReasons.edit': 'Edit Absence Reason',
    'absenceReasons.labelEn': 'Label (English)',
    'absenceReasons.labelFi': 'Label (Finnish)',
    'absenceReasons.reason': 'Reason',
    'absenceReasons.active': 'Active',
    'absenceReasons.inactive': 'Inactive',
    'absenceReasons.noReasons': 'No custom absence reasons. Add reasons above so employees can select them.',
    'absenceReasons.selectReason': 'Select Absence Reason',
    'absenceReasons.noCustomReasons': 'No custom reasons configured.',
    'absenceReasons.markAbsent': 'Mark Absent Today',
    'absenceReasons.otherReason': 'Other / No specific reason',

    // Projects
    'projects.title': 'Projects',
    'projects.add': 'Add Project',
    'projects.edit': 'Edit Project',
    'projects.name': 'Project Name',
    'projects.customer': 'Customer',
    'projects.customerOptional': 'Customer (optional)',
    'projects.status': 'Status',
    'projects.noProjects': 'No projects yet',

    // Reminders
    'reminders.title': 'Reminder Rules',
    'reminders.add': 'Add Reminder',
    'reminders.edit': 'Edit Reminder',
    'reminders.type': 'Type',
    'reminders.time': 'Time',
    'reminders.message': 'Message',
    'reminders.messageEn': 'Message (English)',
    'reminders.messageFi': 'Message (Finnish)',
    'reminders.enabled': 'Enabled',
    'reminders.noReminders': 'No reminder rules configured',
    'reminders.clockIn': 'Clock-In Reminder',
    'reminders.clockOut': 'Clock-Out Reminder',
    'reminders.vacationApproval': 'Vacation Approval',
    'reminders.managerApproval': 'Manager Approval',

    // Common
    'common.save': 'Save Changes',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.approve': 'Approve',
    'common.reject': 'Reject',
    'common.pending': 'pending',
    'common.approved': 'approved',
    'common.rejected': 'rejected',
    'common.name': 'Name',
    'common.email': 'Email',
    'common.role': 'Role',
    'common.actions': 'Actions',
    'common.updated': 'Updated',
    'common.deleted': 'Deleted',
    'common.added': 'Added',
  },
  fi: {
    // Settings
    'settings.title': 'Asetukset',
    'settings.appearance': 'Ulkoasu',
    'settings.language': 'Kieli',
    'settings.about': 'Tietoja',
    'settings.version': 'Versio',
    'settings.platform': 'Alusta',
    'settings.offline': 'Offline',
    'settings.enabled': 'Käytössä',
    'theme.light': 'Vaalea',
    'theme.dark': 'Tumma',
    'theme.system': 'Järjestelmä',
    'lang.en': 'English',
    'lang.fi': 'Suomi',

    // Dashboard
    'dashboard.clockIn': 'Leimaa sisään',
    'dashboard.clockOut': 'Leimaa ulos',
    'dashboard.sickLeave': 'Sairausloma',
    'dashboard.absence': 'Poissaolo',
    'dashboard.today': 'Tänään',
    'dashboard.workHours': 'Työtunnit',

    // Admin
    'admin.title': 'Hallintapaneeli',
    'admin.statistics': 'Tilastot',
    'admin.approvals': 'Hyväksynnät',
    'admin.vacationApprovals': 'Lomahyväksynnät',
    'admin.absences': 'Poissaolot',
    'admin.projects': 'Projektit',
    'admin.workplaces': 'GPS-työpaikat',
    'admin.reminders': 'Muistutukset',
    'admin.employees': 'Työntekijät',
    'admin.companies': 'Yritykset',
    'admin.audit': 'Muutosloki',
    'admin.statisticsDesc': 'Yleiskatsaus ja mittarit',
    'admin.approvalsDesc': 'Matkat ja projektitunnit',
    'admin.vacationApprovalsDesc': 'Tarkista lomapyynnöt',
    'admin.absencesDesc': 'Sairausloma ja poissaolot',
    'admin.projectsDesc': 'Hallinnoi projekteja',
    'admin.workplacesDesc': 'Geofence-sijainnit',
    'admin.remindersDesc': 'Ilmoitussäännöt',
    'admin.employeesDesc': 'Hallinnoi tiimin jäseniä',
    'admin.companiesDesc': 'Yrityksen asetukset',
    'admin.auditDesc': 'Muutoshistoria',

    // Absence reasons
    'absenceReasons.title': 'Poissaolon syyt',
    'absenceReasons.description': 'Mukautetut syyt joita työntekijät voivat valita poissaoloa merkitessä',
    'absenceReasons.add': 'Lisää syy',
    'absenceReasons.edit': 'Muokkaa poissaolon syytä',
    'absenceReasons.labelEn': 'Nimi (englanti)',
    'absenceReasons.labelFi': 'Nimi (suomi)',
    'absenceReasons.reason': 'Syy',
    'absenceReasons.active': 'Aktiivinen',
    'absenceReasons.inactive': 'Ei käytössä',
    'absenceReasons.noReasons': 'Ei mukautettuja poissaolosyitä. Lisää syitä yllä, jotta työntekijät voivat valita niitä.',
    'absenceReasons.selectReason': 'Valitse poissaolon syy',
    'absenceReasons.noCustomReasons': 'Ei mukautettuja syitä konfiguroitu.',
    'absenceReasons.markAbsent': 'Merkitse poissa tänään',
    'absenceReasons.otherReason': 'Muu / Ei erityistä syytä',

    // Projects
    'projects.title': 'Projektit',
    'projects.add': 'Lisää projekti',
    'projects.edit': 'Muokkaa projektia',
    'projects.name': 'Projektin nimi',
    'projects.customer': 'Asiakas',
    'projects.customerOptional': 'Asiakas (valinnainen)',
    'projects.status': 'Tila',
    'projects.noProjects': 'Ei projekteja vielä',

    // Reminders
    'reminders.title': 'Muistutussäännöt',
    'reminders.add': 'Lisää muistutus',
    'reminders.edit': 'Muokkaa muistutusta',
    'reminders.type': 'Tyyppi',
    'reminders.time': 'Aika',
    'reminders.message': 'Viesti',
    'reminders.messageEn': 'Viesti (englanti)',
    'reminders.messageFi': 'Viesti (suomi)',
    'reminders.enabled': 'Käytössä',
    'reminders.noReminders': 'Ei muistutussääntöjä konfiguroitu',
    'reminders.clockIn': 'Sisäänkirjausmuistutus',
    'reminders.clockOut': 'Uloskirjausmuistutus',
    'reminders.vacationApproval': 'Lomahyväksyntä',
    'reminders.managerApproval': 'Esimiehen hyväksyntä',

    // Common
    'common.save': 'Tallenna muutokset',
    'common.cancel': 'Peruuta',
    'common.delete': 'Poista',
    'common.edit': 'Muokkaa',
    'common.add': 'Lisää',
    'common.approve': 'Hyväksy',
    'common.reject': 'Hylkää',
    'common.pending': 'odottaa',
    'common.approved': 'hyväksytty',
    'common.rejected': 'hylätty',
    'common.name': 'Nimi',
    'common.email': 'Sähköposti',
    'common.role': 'Rooli',
    'common.actions': 'Toiminnot',
    'common.updated': 'Päivitetty',
    'common.deleted': 'Poistettu',
    'common.added': 'Lisätty',
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('timetrack-language') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('timetrack-language', lang);
  };

  const t = (key: TranslationKey): string => {
    return translations[language]?.[key] ?? translations.en[key] ?? key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}

// Helper to get translated field from a record with language-specific columns
export function getLocalizedField(record: any, field: string, language: Language): string {
  if (language === 'fi' && record[`${field}_fi`]) {
    return record[`${field}_fi`];
  }
  return record[field] || '';
}
