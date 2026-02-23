'use client';

import React, { useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Save, Download, Upload, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/stores/useProjectStore';
import { exportJson, importJson } from '@/api/client';

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

interface TopBarProps {
  onSave?: () => void;
  saveLabel?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ onSave, saveLabel }) => {
  const pathname = usePathname();
  const router = useRouter();
  const projects = useProjectStore((s) => s.projects);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const breadcrumbs = getBreadcrumbs(pathname, currentProject?.name);
  const isEditor = pathname.startsWith('/editor');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    if (!currentProjectId) return;
    try {
      const blob = await exportJson(currentProjectId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${currentProjectId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await importJson(data);
      await fetchProjects();
      router.push(`/editor/${result.projectId}`);
    } catch (err) {
      console.error('Import failed:', err);
    }
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

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
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelected}
          />
          <Button variant="outline" size="sm" onClick={handleImportClick}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
          <Button size="sm" onClick={onSave}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saveLabel ?? 'Save'}
          </Button>
        </div>
      )}
    </header>
  );
};
