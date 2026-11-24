import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, ArrowRightIcon, RotateCcwIcon } from 'lucide-react';
import { WorkspaceHeader } from '@/components/app-shell/workspace-header';
import { Button } from '@/components/ui/button';
import { resetDubSession, useDubSession } from '@/features/dub/dub-session';
import { MediaPane } from './media-pane';
import { Stepper, STEP_KEYS } from './stepper';
import { StepVideo } from './step-video';
import { StepVoice } from './step-voice';
import { StepScript } from './step-script';
import { StepGenerate } from './step-generate';
import { StepExport } from './step-export';
import {
  goToStep,
  reachableStep,
  resetDubflow,
  syncStep,
  useDubflow,
  type DubflowStep,
} from './dubflow-state';

/**
 * Clone → dub in five steps. Pipeline state lives in the shared dub session
 * (so drafts, recovery and the export panel keep working); this page only
 * decides which step is visible and when the next one unlocks.
 */
export function DubflowPage() {
  const { t } = useTranslation();
  const session = useDubSession();
  const flow = useDubflow();
  const reachable = reachableStep(session, flow);
  const step = (flow.step > reachable ? reachable : flow.step) as DubflowStep;
  // Transcription finishing (or a reset) changes what is reachable; keep the
  // stored step honest and move forward automatically after the upload step.
  useEffect(() => {
    syncStep();
    if (flow.step === 1 && reachable >= 2 && session.phase === 'editing' && flow.jobId !== session.jobId)
      goToStep(2);
  }, [flow.jobId, flow.step, reachable, session.jobId, session.phase]);
  const busy = !['idle', 'editing', 'done'].includes(session.phase);
  const startOver = () => {
    if (busy || session.recovery || !resetDubSession()) return;
    resetDubflow();
  };
  return (
    <div data-slot="dubflow" className="flex h-full min-h-0 flex-col">
      <WorkspaceHeader>
        <h1 className="shrink-0 text-sm font-medium">{t('dubWorkspace.title')}</h1>
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]">
          <Stepper current={step} reachable={reachable} onSelect={goToStep} />
        </div>
        {session.jobId && (
          <Button
            size="xs"
            variant="ghost"
            className="shrink-0"
            disabled={busy || Boolean(session.recovery)}
            onClick={startOver}
          >
            <RotateCcwIcon />
            {t('dubflow.start_over')}
          </Button>
        )}
      </WorkspaceHeader>
      <div className="@container grid min-h-0 flex-1 gap-4 p-4 @4xl:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]">
        <main className="@container flex min-h-0 flex-col overflow-y-auto pr-1">
          {step === 1 && <StepVideo session={session} />}
          {step === 2 && <StepVoice session={session} />}
          {step === 3 && <StepScript session={session} />}
          {step === 4 && <StepGenerate session={session} />}
          {step === 5 && <StepExport session={session} />}
        </main>
        <MediaPane session={session} className="min-h-0 self-start @4xl:sticky @4xl:top-0" />
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border/50 px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={step === 1}
          onClick={() => goToStep((step - 1) as DubflowStep)}
        >
          <ArrowLeftIcon />
          {t('common.back')}
        </Button>
        <span className="text-xs text-muted-foreground">
          {step < 5 && step >= reachable && !busy ? t('dubflow.not_ready') : ''}
        </span>
        <Button
          size="sm"
          disabled={step >= 5 || step >= reachable}
          onClick={() => goToStep((step + 1) as DubflowStep)}
        >
          {step < 5 ? t('dubflow.next_step', { step: t(STEP_KEYS[(step + 1) as DubflowStep]) }) : t('dubflow.step_export')}
          <ArrowRightIcon />
        </Button>
      </footer>
    </div>
  );
}
