'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { api } from '@/api/client';
import { Plus, FolderOpen, Trash2, LayoutTemplate } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface Template {
  slug: string;
  name: string;
  description: string;
}

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [projectList, templateList] = await Promise.all([
        api.projects.list(),
        api.templates.list(),
      ]);
      setProjects(projectList);
      setTemplates(templateList);
    } catch {
      console.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function createBlankProject() {
    const project = await api.projects.create({ name: 'Новый проект' });
    const scenario = await api.scenarios.create(project.id, {
      name: 'Сценарий A',
      modelJson: { id: crypto.randomUUID(), name: 'Новая модель', nodes: [], edges: [], config: { seed: 42, duration: 480, timeUnit: 'min', warmupPeriod: 60 } },
    });
    router.push(`/editor/${project.id}?scenario=${scenario.id}`);
  }

  async function createFromTemplate(slug: string) {
    const template = await api.templates.get(slug);
    const project = await api.projects.create({ name: template.name });
    const scenario = await api.scenarios.create(project.id, {
      name: 'Сценарий A',
      modelJson: template.model,
    });
    router.push(`/editor/${project.id}?scenario=${scenario.id}`);
  }

  async function deleteProject(id: string) {
    await api.projects.delete(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Проекты</h1>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowTemplates(!showTemplates)}>
              <LayoutTemplate className="w-4 h-4 mr-2" />
              Из шаблона
            </Button>
            <Button onClick={createBlankProject}>
              <Plus className="w-4 h-4 mr-2" />
              Новый проект
            </Button>
          </div>
        </div>

        {showTemplates && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Шаблоны</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <Card
                  key={t.slug}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => createFromTemplate(t.slug)}
                >
                  <CardHeader>
                    <CardTitle className="text-sm">{t.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500">{t.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Пока нет проектов</p>
            <Button onClick={createBlankProject}>Создать первый проект</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card key={project.id} className="group">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle
                      className="text-sm cursor-pointer hover:text-blue-600"
                      onClick={() => router.push(`/editor/${project.id}`)}
                    >
                      {project.name}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => deleteProject(project.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-400">
                    {new Date(project.updatedAt).toLocaleDateString('ru-RU')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
