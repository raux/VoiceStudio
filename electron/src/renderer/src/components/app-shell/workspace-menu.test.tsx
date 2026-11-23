import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, activeProps: _activeProps, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/lib/store/workspace', () => ({ setWorkspace: vi.fn() }));
import { WorkspaceNavigation } from './workspace-menu';

it('exposes only the clone → dub destinations', () => {
  render(<WorkspaceNavigation />);
  const links = screen.getAllByRole('link');
  expect(links.map((link) => link.getAttribute('href'))).toEqual([
    '/dub',
    '/clone',
    '/personas',
    '/projects',
  ]);
  expect(screen.getByRole('link', { name: 'dubWorkspace.title' })).toHaveAttribute('href', '/dub');
  expect(screen.queryByRole('link', { name: 'designWorkspace.title' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'nav.gallery' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'nav.stories' })).toBeNull();
});

it('labels compact rail items for assistive tech', () => {
  render(<WorkspaceNavigation compact />);
  expect(screen.getByRole('link', { name: 'nav.clone_short' })).toHaveAttribute('href', '/clone');
  expect(screen.getByRole('link', { name: 'nav.saved' })).toHaveAttribute('href', '/personas');
});
