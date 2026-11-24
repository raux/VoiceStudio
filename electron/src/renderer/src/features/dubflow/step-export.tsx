import { useTranslation } from 'react-i18next';
import { DubExportPanel } from '@/features/dub/dub-export-panel';
import type { DubSession } from '@/features/dub/dub-session';

export function StepExport({ session }: { session: DubSession }) {
  const { t } = useTranslation();
  const busy = !['idle', 'editing', 'done'].includes(session.phase) || Boolean(session.recovery);
  return (
    <section data-slot="dubflow-step-export" className="space-y-4">
      <header>
        <h2 className="text-base font-semibold">{t('dubflow.export_title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('dubflow.export_hint')}</p>
      </header>
      <div className="rounded-2xl border border-border/60 bg-card/30 p-4">
        <DubExportPanel key={session.jobId || session.inputType} session={session} disabled={busy} />
      </div>
    </section>
  );
}
