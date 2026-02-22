'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  BarChart3,
  GitCompare,
  Plus,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/stores/useProjectStore';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Projects', icon: FolderOpen },
  { href: '/editor', label: 'Editor', icon: LayoutGrid },
  { href: '/results', label: 'Results', icon: BarChart3 },
  { href: '/compare', label: 'Compare', icon: GitCompare },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const scenarios = useProjectStore((s) => s.scenarios);
  const currentScenarioId = useProjectStore((s) => s.currentScenarioId);
  const setCurrentScenario = useProjectStore((s) => s.setCurrentScenario);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);

  return (
    <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
      {/* Logo / brand */}
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4">
        <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center">
          <span className="text-xs font-bold text-white">FS</span>
        </div>
        <span className="text-lg font-semibold text-gray-900">FlowSim</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={
                item.href === '/editor' && currentProjectId
                  ? `/editor/${currentProjectId}`
                  : item.href === '/results'
                    ? '/results/latest'
                    : item.href
              }
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Scenario Tabs */}
      {currentProjectId && (
        <div className="border-t border-gray-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Scenarios
            </span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-0.5">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => setCurrentScenario(scenario.id)}
                className={cn(
                  'flex w-full items-center rounded-md px-3 py-1.5 text-left text-sm transition-colors',
                  currentScenarioId === scenario.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                {scenario.name}
              </button>
            ))}
            {scenarios.length === 0 && (
              <p className="px-3 py-1.5 text-xs text-gray-400">
                No scenarios yet
              </p>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
