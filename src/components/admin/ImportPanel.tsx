import { useTranslation } from '@/lib/i18n';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Target, Users, FileSpreadsheet } from 'lucide-react';
import { WeeklyGoalsImport } from './import/WeeklyGoalsImport';
import { EmployeesCsvImport } from './import/EmployeesCsvImport';
import { EmployeesFennoaImport } from './import/EmployeesFennoaImport';

/**
 * Top-level import panel — shows three CSV/XLSX importers in tabs.
 * Sub-components live in ./import/ to keep this file small.
 */
export function ImportPanel() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-display font-bold">{t('admin.import')}</h2>
        <p className="text-sm text-muted-foreground">{t('admin.importDesc')}</p>
      </div>
      <Tabs defaultValue="weekly-goals">
        <TabsList className="bg-muted/50 p-1 flex-wrap h-auto">
          <TabsTrigger value="weekly-goals" className="data-[state=active]:bg-background">
            <Target className="w-4 h-4 mr-2" />{t('admin.importWeeklyGoals')}
          </TabsTrigger>
          <TabsTrigger value="employees-csv" className="data-[state=active]:bg-background">
            <Users className="w-4 h-4 mr-2" />{t('admin.importCsv')}
          </TabsTrigger>
          <TabsTrigger value="employees-fennoa" className="data-[state=active]:bg-background">
            <FileSpreadsheet className="w-4 h-4 mr-2" />{t('admin.importFennoa')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="weekly-goals" className="mt-4"><WeeklyGoalsImport /></TabsContent>
        <TabsContent value="employees-csv" className="mt-4"><EmployeesCsvImport /></TabsContent>
        <TabsContent value="employees-fennoa" className="mt-4"><EmployeesFennoaImport /></TabsContent>
      </Tabs>
    </div>
  );
}
