'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Save, Download, Upload, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/stores/useProjectStore';

function getBreadcrumbs(pathname: string, projectName?: string): string[] {
  const crumbs = ['FlowSim'];
  if (pathname === '/') {
    crumbs.push('Projects');
  } else if (pathname.startsWith('/editor')) {
    crumbs.push(projectName ?? 'Project');
    crumbs.push('Editor');
  } else if (pathname.startsWith('/results')) {
    crumbs.push(projectName ?? 'Project');
    crumbs.push('Results');
  } else if (pathname.startsWith('/compare')) {
    crumbs.push(projectName ?? 'Project');
    crumbs.push('Compare');
  }
  return crumbs;
}

export const TopBar: React.FC = () => {
  const pathname = usePathname();
  const projects = useProjectStore((s) => s.projects);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const breadcrumbs = getBreadcrumbs(pathname, currentProject?.name);
  const isEditor = pathname.startsWith('/editor');

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            )}
            <span
              className={
                i === breadcrumbs.length - 1
                  ? 'font-medium text-gray-900'
                  : 'text-gray-500'
              }
            >
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Action buttons */}
      {isEditor && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
          <Button size="sm">
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      )}
    </header>
  );
};
