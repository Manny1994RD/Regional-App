// src/components/Reports.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { StorageManager } from '@/lib/storage';
import { Branch, Entry, TimeGranularity } from '@/types';

type Row = {
  period: string;
  branch: string;  // branch id
  branchName: string;
  amount: number;
  percentage: number;
};

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0-6 (0 = Sunday)
  const diff = (day === 0 ? -6 : 1) - day; // start Monday
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfWeek(d: Date) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}
function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  return x;
}
function endOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return x;
}
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium', timeZone: 'America/Santo_Domingo' }).format(d);
}
function fmtNumber(n: number) {
  return n.toLocaleString('es-DO');
}

export default function Reports() {
  const [storage] = useState(() => StorageManager.getInstance());

  const [branches, setBranches] = useState<Branch[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [regionalGoal, setRegionalGoal] = useState(0);

  // UI controls
  const [granularity, setGranularity] = useState<TimeGranularity>('week');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    const s = storage.getState();
    const safeBranches = Array.isArray(s.branches) ? s.branches : [];
    setBranches(safeBranches);
    setEntries((s.entries || []).filter(e => !e.isDeleted));
    setRegionalGoal(s.regionalGoal || 0);

    // set defaults if empty
    if (!dateFrom || !dateTo) {
      const today = new Date();
      const start = startOfWeek(today);
      const end = endOfWeek(today);
      setDateFrom(start.toISOString().slice(0, 10));
      setDateTo(end.toISOString().slice(0, 10));
    }
  }, [storage]);

  const branchById = useMemo(() => {
    const map = new Map<string, Branch>();
    for (const b of branches) map.set(b.id, b);
    return map;
  }, [branches]);

  const filteredEntries = useMemo(() => {
    if (!dateFrom || !dateTo) return entries;
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    return entries.filter(e => e.timestamp >= start.getTime() && e.timestamp <= end.getTime());
  }, [entries, dateFrom, dateTo]);

  // Build period key based on granularity
  const getPeriodKey = (ts: number) => {
    const d = new Date(ts);
    if (granularity === 'day') {
      return fmtDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    } else if (granularity === 'week') {
      const s = startOfWeek(d);
      const e = endOfWeek(d);
      return `${fmtDate(s)} – ${fmtDate(e)}`;
    } else if (granularity === 'month') {
      const s = startOfMonth(d);
      return new Intl.DateTimeFormat('es-DO', { month: 'long', year: 'numeric' }).format(s);
    }
    return 'Total';
  };

  const rows: Row[] = useMemo(() => {
    // Guard: ensure branches is array
    const brs = Array.isArray(branches) ? branches : [];
    const results = new Map<string, Map<string, number>>(); // period -> branchId -> amount

    for (const e of filteredEntries) {
      if (e.isDeleted) continue;
      const period = getPeriodKey(e.timestamp);
      if (!results.has(period)) results.set(period, new Map<string, number>());
      for (const a of e.allocations) {
        const m = results.get(period)!;
        m.set(a.branchId, (m.get(a.branchId) || 0) + a.amount);
      }
    }

    const out: Row[] = [];
    // For stable order by period, then by branch order
    const periods = Array.from(results.keys());
    if (granularity !== 'total') {
      for (const period of periods) {
        const m = results.get(period)!;
        for (const b of brs) {
          const amount = m.get(b.id) || 0;
          // percentage against branch goal (fallback to regional)
          const pct = b.goal > 0 ? (amount / b.goal) * 100 : (regionalGoal > 0 ? (amount / regionalGoal) * 100 : 0);
          out.push({
            period,
            branch: b.id,
            branchName: b.name,
            amount,
            percentage: pct,
          });
        }
      }
    } else {
      // total: collapse all periods
      const totalByBranch = new Map<string, number>();
      for (const [, map] of results) {
        for (const [branchId, amt] of map) {
          totalByBranch.set(branchId, (totalByBranch.get(branchId) || 0) + amt);
        }
      }
      for (const b of brs) {
        const amount = totalByBranch.get(b.id) || 0;
        const pct = b.goal > 0 ? (amount / b.goal) * 100 : (regionalGoal > 0 ? (amount / regionalGoal) * 100 : 0);
        out.push({
          period: 'Total',
          branch: b.id,
          branchName: b.name,
          amount,
          percentage: pct,
        });
      }
    }

    return out;
  }, [branches, filteredEntries, granularity, regionalGoal]);

  // Aggregate totals per period for a footer row (optional)
  const totalsByPeriod = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.period, (map.get(r.period) || 0) + r.amount);
    }
    return map;
  }, [rows]);

  const periodsOrdered = useMemo(() => {
    const set = Array.from(new Set(rows.map(r => r.period)));
    // Keep natural insertion order (computed from data)
    return set;
  }, [rows]);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reportes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Granularidad</label>
              <Select value={granularity} onValueChange={(v: TimeGranularity) => setGranularity(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Día</SelectItem>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="month">Mes</SelectItem>
                  <SelectItem value="total">Total</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Desde</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Hasta</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={() => {
                  // normalize input if empty
                  if (!dateFrom || !dateTo) {
                    const today = new Date();
                    setDateFrom(startOfWeek(today).toISOString().slice(0, 10));
                    setDateTo(endOfWeek(today).toISOString().slice(0, 10));
                  }
                }}
              >
                Aplicar
              </Button>
            </div>
          </div>

          {/* Tabla por periodo y sucursal */}
          {periodsOrdered.length === 0 ? (
            <div className="text-sm text-muted-foreground">No hay datos en el rango seleccionado.</div>
          ) : (
            periodsOrdered.map(period => (
              <div key={period} className="space-y-2">
                <div className="font-medium mt-4">{period}</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sucursal</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">% de Meta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows
                      .filter(r => r.period === period)
                      .map(r => (
                        <TableRow key={`${period}-${r.branch}`}>
                          <TableCell className="font-medium">{r.branchName}</TableCell>
                          <TableCell className="text-right">{fmtNumber(r.amount)}</TableCell>
                          <TableCell className="text-right">{r.percentage.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    <TableRow>
                      <TableCell className="font-semibold">Total</TableCell>
                      <TableCell className="text-right font-semibold">
                        {fmtNumber(totalsByPeriod.get(period) || 0)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">—</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
