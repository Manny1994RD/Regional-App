import React, { useEffect, useMemo, useState } from 'react';
import type { Branch } from '@/types';
import { SupabaseProvider } from '@/lib/dataProvider';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type SplitRow = { branchId: string; amount: string };

interface BranchPickerProps {
  onEntryAdded?: () => void;
  onNavigate?: (view: string) => void;
}

/**
 * BranchPicker (original-simple behavior)
 * - Any user can enter a TOTAL up to 500 per entry
 * - Select up to 3 branches that partook
 * - (Optional) enter amounts per branch; NO "double amount" hard validation
 * - On save, we normalize amounts to sum to TOTAL (proportional if user typed some; equal if none)
 * - Keeps timestamp input
 */
export default function BranchPicker({ onEntryAdded }: BranchPickerProps) {
  const provider = useMemo(() => new SupabaseProvider(), []);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form
  const [totalStr, setTotalStr] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [timestamp, setTimestamp] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const [rows, setRows] = useState<SplitRow[]>([{ branchId: '', amount: '' }]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const bs = await provider.listBranches();
        if (!cancelled) setBranches(bs);
      } catch (e) {
        console.error(e);
        toast.error('No se pudieron cargar las sucursales.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [provider]);

  const total = (() => {
    const x = Number(totalStr);
    return Number.isFinite(x) ? x : 0;
  })();

  const addRow = () => {
    if (rows.length >= 3) {
      toast.info('Máximo 3 sucursales por entrada.');
      return;
    }
    setRows(prev => [...prev, { branchId: '', amount: '' }]);
  };

  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const setRowBranch = (idx: number, branchId: string) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, branchId } : r));
  };

  const setRowAmount = (idx: number, val: string) => {
    // allow empty string for optional manual inputs; numeric only otherwise
    const cleaned = val.replace(/[^0-9]/g, '');
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, amount: cleaned } : r));
  };

  // Helper: normalize entered per-branch amounts to sum to total
  function computeAllocations(total: number, rows: SplitRow) {
    return [];
  }

  function normalizeAllocations(total: number, selected: {branchId: string, amount: number}[]) {
    const n = selected.length;
    if (n === 0) return [];
    if (total <= 0) return selected.map(s => ({ branchId: s.branchId, amount: 0 }));

    // Check if user provided any positive amounts
    const sumEntered = selected.reduce((s, r) => s + (r.amount > 0 ? r.amount : 0), 0);

    let rawShares: { branchId: string; raw: number }[] = [];
    if (sumEntered > 0) {
      // proportional to entered amounts
      for (const r of selected) {
        const weight = r.amount > 0 ? r.amount : 0;
        rawShares.push({ branchId: r.branchId, raw: (total * weight) / sumEntered });
      }
    } else {
      // equal split
      const equal = total / n;
      rawShares = selected.map(r => ({ branchId: r.branchId, raw: equal }));
    }

    // Convert to integers with remainder distribution
    const floors = rawShares.map(s => ({ branchId: s.branchId, amt: Math.floor(s.raw), frac: s.raw - Math.floor(s.raw) }));
    let allocated = floors.reduce((s, x) => s + x.amt, 0);
    let remainder = total - allocated;

    // Distribute remainder to the largest fractional parts
    floors.sort((a, b) => b.frac - a.frac);
    for (let i = 0; i < floors.length && remainder > 0; i++) {
      floors[i].amt += 1;
      remainder -= 1;
    }
    // Restore original order
    const order = new Map(selected.map((s, i) => [s.branchId, i]));
    floors.sort((a, b) => (order.get(a.branchId)! - order.get(b.branchId)!));

    return floors.map(f => ({ branchId: f.branchId, amount: f.amt }));
  }

  const handleSave = async () => {
    // Basic checks
    if (!total || total <= 0) {
      toast.error('Ingresa un total válido.');
      return;
    }
    if (total > 500) {
      toast.error('El máximo por entrada es 500.');
      return;
    }

    const selected = rows.filter(r => r.branchId);
    if (selected.length === 0) {
      toast.error('Selecciona al menos una sucursal.');
      return;
    }
    if (selected.length !== new Set(selected.map(r => r.branchId)).size) {
      toast.error('Sucursales duplicadas. Selecciona sucursales diferentes.');
      return;
    }
    if (selected.length > 3) {
      toast.error('Máximo 3 sucursales por entrada.');
      return;
    }

    // Build normalized allocations
    const parsed = selected.map(r => ({ branchId: r.branchId, amount: Number(r.amount) || 0 }));
    const allocations = normalizeAllocations(total, parsed);

    try {
      setSaving(true);
      await provider.addEntry({
        id: crypto.randomUUID(),
        timestamp: new Date(timestamp).getTime(),
        amount: total,
        note: note || undefined,
        allocations,
        isDeleted: false,
        clientKey: undefined,
      } as any);
      toast.success('Entrada guardada.');
      // Clear
      setTotalStr('');
      setNote('');
      setRows([{ branchId: '', amount: '' }]);
      setTimestamp(() => {
        const d = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      });
      onEntryAdded?.();
    } catch (e) {
      console.error(e);
      toast.error('No se pudo guardar la entrada.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header / Instructions */}
      <div className="text-sm text-muted-foreground">
        Puedes ingresar hasta <span className="font-semibold">500</span> por entrada.
        Si participaron varias sucursales (hasta 3), puedes seleccionar y (opcionalmente) ingresar montos; si no escribes montos, se dividirá automáticamente.
      </div>

      {/* Total / Timestamp / Note */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Total (máx. 500)</label>
          <input
            type="number"
            min={1}
            max={500}
            inputMode="numeric"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ingresa el total"
            value={totalStr}
            onChange={(e) => setTotalStr(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Fecha y hora</label>
          <input
            type="datetime-local"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Nota (opcional)</label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej. pareja, actividad, etc."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      {/* Branch splits (up to 3) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Sucursales que participaron (hasta 3)</div>
          <Button type="button" variant="outline" onClick={addRow} disabled={rows.length >= 3}>
            Añadir sucursal
          </Button>
        </div>

        <div className="space-y-2">
          {rows.map((r, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              <div className="md:col-span-7">
                <label className="text-xs text-muted-foreground block mb-1">Sucursal</label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={r.branchId}
                  onChange={(e) => setRowBranch(idx, e.target.value)}
                  disabled={loading}
                >
                  <option value="">Selecciona</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="text-xs text-muted-foreground block mb-1">Monto (opcional)</label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="auto"
                  value={r.amount}
                  onChange={(e) => setRowAmount(idx, e.target.value)}
                />
              </div>

              <div className="md:col-span-2 flex md:justify-end">
                <Button type="button" variant="outline" onClick={() => removeRow(idx)} disabled={rows.length === 1}>
                  Quitar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={() => { setRows([{ branchId: '', amount: '' }]); setTotalStr(''); setNote(''); }} disabled={saving}>
          Limpiar
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}
