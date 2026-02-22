'use client';

import { useState } from 'react';

interface NodeMetricRow {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  utilization: number;
  avgQueueLength: number;
  avgWaitTime: number;
  avgServiceTime: number;
  processed: number;
}

interface MetricsTableProps {
  data: NodeMetricRow[];
}

type SortKey = keyof NodeMetricRow;

export function MetricsTable({ data }: MetricsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('utilization');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === 'number' ? (av as number) - (bv as number) : String(av).localeCompare(String(bv));
    return sortAsc ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  const columns: { key: SortKey; label: string; format?: (v: number) => string }[] = [
    { key: 'nodeName', label: 'Узел' },
    { key: 'nodeType', label: 'Тип' },
    { key: 'utilization', label: 'Загрузка', format: (v) => `${(v * 100).toFixed(1)}%` },
    { key: 'avgQueueLength', label: 'Ср. очередь', format: (v) => v.toFixed(1) },
    { key: 'avgWaitTime', label: 'Ср. ожидание', format: (v) => v.toFixed(1) },
    { key: 'avgServiceTime', label: 'Ср. обслуживание', format: (v) => v.toFixed(1) },
    { key: 'processed', label: 'Обработано' },
  ];

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-700 p-4 pb-2">Метрики по узлам</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="px-4 py-2 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                >
                  {col.label} {sortKey === col.key ? (sortAsc ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.nodeId} className="border-b hover:bg-gray-50">
                {columns.map((col) => {
                  const val = row[col.key];
                  return (
                    <td key={col.key} className="px-4 py-2">
                      {col.format && typeof val === 'number' ? col.format(val) : String(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
