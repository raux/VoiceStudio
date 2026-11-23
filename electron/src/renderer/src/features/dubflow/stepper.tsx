import { CheckIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { DubflowStep } from './dubflow-state';

export const STEP_KEYS: Record<DubflowStep, string> = {
  1: 'dubflow.step_video',
  2: 'dubflow.step_voice',
  3: 'dubflow.step_script',
  4: 'dubflow.step_generate',
  5: 'dubflow.step_export',
};
const STEPS: DubflowStep[] = [1, 2, 3, 4, 5];

export function Stepper({
  current,
  reachable,
  onSelect,
}: {
  current: DubflowStep;
  reachable: DubflowStep;
  onSelect: (step: DubflowStep) => void;
}) {
  const { t } = useTranslation();
  return (
    <ol
      data-slot="dubflow-stepper"
      aria-label={t('dubflow.steps')}
      className="flex min-w-0 items-center gap-1 text-xs"
    >
      {STEPS.map((step, index) => {
        const done = step < reachable;
        const active = step === current;
        const enabled = step <= reachable;
        return (
          <li key={step} className="flex min-w-0 items-center gap-1">
            {index > 0 && (
              <span
                aria-hidden="true"
                className={cn('h-px w-4 shrink-0', done || active ? 'bg-primary/60' : 'bg-border')}
              />
            )}
            <button
              type="button"
              disabled={!enabled}
              aria-current={active ? 'step' : undefined}
              onClick={() => onSelect(step)}
              className={cn(
                'flex h-7 min-w-0 items-center gap-1.5 rounded-full px-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-primary text-primary-foreground'
                  : enabled
                    ? 'bg-muted/60 text-foreground hover:bg-muted'
                    : 'bg-muted/30 text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-semibold',
                  active ? 'bg-primary-foreground/20' : 'bg-background/60',
                )}
              >
                {done && !active ? <CheckIcon className="size-3" aria-hidden="true" /> : step}
              </span>
              <span className="truncate">{t(STEP_KEYS[step])}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
