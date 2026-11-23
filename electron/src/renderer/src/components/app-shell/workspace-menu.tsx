import { Link } from '@tanstack/react-router';
import { FilmIcon, FingerprintIcon, FolderIcon, UsersRoundIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { setWorkspace } from '@/lib/store/workspace';
import { cn } from '@/lib/utils';
import './workspace-menu.css';

type Destination = readonly [
  to: '/dub' | '/clone' | '/personas' | '/projects',
  label: string,
  icon: typeof FilmIcon,
  activate?: () => void,
];

const openSaved = () => setWorkspace({ libraryOpen: true, libraryTab: 'voices' });

// Clone → dub focused navigation: one dubbing workspace, the voices that feed
// it, and the projects it produces. Everything else stays reachable only by
// URL and redirects home (see routes/index.ts hiddenRoute).
const destinations: Destination[] = [
  ['/dub', 'dubWorkspace.title', FilmIcon],
  ['/clone', 'nav.clone_short', FingerprintIcon, openSaved],
  ['/personas', 'nav.saved', UsersRoundIcon, openSaved],
  ['/projects', 'projects.title', FolderIcon],
];

const itemClass =
  'workspace-nav-item group relative isolate flex h-8 min-w-0 items-center overflow-hidden rounded-md text-sm text-sidebar-foreground/80 outline-none transition-[color,background-color,box-shadow,backdrop-filter] duration-150 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-gradient-to-r before:from-white/[0.07] before:via-white/[0.025] before:to-transparent before:opacity-0 before:transition-opacity before:duration-150 hover:bg-sidebar-accent/65 hover:text-sidebar-foreground hover:backdrop-blur-xl hover:shadow-[inset_0_1px_0_rgb(255_255_255/9%),0_6px_18px_rgb(0_0_0/10%)] hover:ring-1 hover:ring-inset hover:ring-sidebar-border/60 hover:before:opacity-100 focus-visible:ring-2 focus-visible:ring-ring';
const iconClass =
  'workspace-nav-icon size-4 shrink-0 text-muted-foreground transition-[color,filter] duration-150';

const iconMotion: Record<Destination[0], string> = {
  '/dub': 'tilt',
  '/clone': 'pulse',
  '/personas': 'nudge',
  '/projects': 'lift',
};

function NavigationLink({
  destination: [to, label, Icon, activate],
  compact = false,
}: {
  destination: Destination;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const link = (
    <Link
      to={to}
      aria-label={compact ? t(label) : undefined}
      onClick={() => activate?.()}
      className={cn(itemClass, compact ? 'h-10 justify-center px-0' : 'gap-2.5 px-2.5')}
      activeProps={{
        className:
          'bg-sidebar-accent/80 text-sidebar-foreground shadow-sm ring-1 ring-inset ring-sidebar-border/60',
        'aria-current': 'page',
      }}
    >
      <Icon
        className={iconClass}
        data-tone={to.slice(1)}
        data-motion={iconMotion[to]}
        aria-hidden="true"
      />
      {!compact && <span className="truncate">{t(label)}</span>}
    </Link>
  );
  if (!compact) return link;
  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{t(label)}</TooltipContent>
    </Tooltip>
  );
}

export function WorkspaceNavigation({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <nav
      data-slot="workspace-navigation"
      aria-label={t('nav.workspaces')}
      className={cn(
        'min-h-0 overflow-y-auto overscroll-contain py-2 [scrollbar-width:none]',
        compact ? 'space-y-0.5 px-1.5' : 'shrink-0 space-y-0.5 px-3',
      )}
    >
      {destinations.map((destination) => (
        <NavigationLink key={destination[0]} destination={destination} compact={compact} />
      ))}
    </nav>
  );
}
