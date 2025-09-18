// src/components/PinAccess.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Branch, Entry, UserRole } from '@/types';
import AdminEntries from '@/components/AdminEntries';
import { SupabaseProvider } from '@/lib/dataProvider';

// Demo PINs (keep for now)
const BRANCH_PINS: Record<string, string> = {
  santiago: '1234',
  moca: '2345',
  'la-vega': '3456',
  jarabacoa: '4567',
  'puerto-plata': '5678',
};
const ADMIN_PIN = '9999';

interface PinAccessProps {
  onNavigate: (view: string) => void;
}

export default function PinAccess({ onNavigate }: PinAccessProps) {
  const provider = useMemo(() => new SupabaseProvider(), []);
  const [pin, setPin] = useState('');
  const [currentUser, setCurrentUser] = useState<{ role: UserRole; branchId?: string } | null>(null);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [regionalGoal, setRegionalGoal] = useState(0);

  // Admin goals panel state
  const [branchGoals, setBranchGoals] = useState<Record<string, string>>({});

  const loadAll = async () => {
    const [b, e, goal] = await Promise.all([
      provider.listBranches(),
      provider.listEntries(),
      provider.getRegionalGoal(),
    ]);
    setBranches(b);
    setEntries(e);
    setRegionalGoal(goal);
    setBranchGoals(Object.fromEntries(b.map((x) => [x.id, String(x.goal ?? 0)])));
  };

  useEffect(() => {
    loadAll().catch(console.error);
    const id = setInterval(loadAll, 30000);
    return () => clearInterval(id);
  }, []);

  const handlePinSubmit = () => {
    const trimmed = pin.trim();
    if (!trimmed) return toast.error('Enter a PIN');

    if (trimmed === ADMIN_PIN) {
      setCurrentUser({ role: 'admin' });
      return toast.success('Admin access granted');
    }

    const match = Object.entries(BRANCH_PINS).find(([, p]) => p === trimmed);
    if (match) {
      const [branchId] = match;
      setCurrentUser({ role: 'leader', branchId });
      const b = branches.find((b) => b.id === branchId)?.name ?? branchId;
      return toast.success(`Leader access: ${b}`);
    }

    if (trimmed === '0000') {
      setCurrentUser({ role: 'public' });
      return toast.success('Public (read-only) access granted');
    }

    toast.error('Invalid PIN');
  };

  const handleSaveGoals = async () => {
    try {
      await Promise.all(
        Object.entries(branchGoals).map(async ([branchId, val]) => {
          const g = parseInt(val, 10);
          if (Number.isFinite(g) && g >= 0) {
            await provider.updateBranchGoal(branchId, g);
          }
        })
      );
      await loadAll();
      toast.success('Goals saved ✅');
    } catch (e) {
      console.error(e);
      toast.error('Could not save goals');
    }
  };

  const formatNumber = (n: number) => n.toLocaleString('es-DO');
  const formatDate = (timestamp: number) =>
    new Intl.DateTimeFormat('es-DO', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Santo_Domingo',
    }).format(timestamp);

  // ======== RENDER ========

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">PIN Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter your PIN</label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button onClick={handlePinSubmit}>Enter</Button>
            </div>

            <div className="text-xs text-muted-foreground pt-2">
              <div>Admin: 9999</div>
              <div>Branches: 1234 (Santiago), 2345 (Moca), 3456 (La Vega), 4567 (Jarabacoa), 5678 (Puerto Plata)</div>
              <div>Public (read-only): 0000</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const myBranch = currentUser.branchId
    ? branches.find((b) => b.id === currentUser.branchId)
    : undefined;

  const visibleEntries =
    currentUser.role === 'admin'
      ? entries.filter((e) => !e.isDeleted)
      : currentUser.role === 'leader' && currentUser.branchId
      ? entries.filter(
          (e) => !e.isDeleted && e.allocations.some((a) => a.branchId === currentUser.branchId)
        )
      : [];

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Top actions */}
      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          <Button variant="default" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
          <Button variant="outline" onClick={() => onNavigate('reports')}>Reports</Button>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          Role:&nbsp;<span className="font-medium">{currentUser.role}</span>
          {myBranch && (
            <>
              &nbsp;·&nbsp;Branch:&nbsp;<span className="font-medium">{myBranch.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Admin: Configure Goals (branch goals only; regional is sum) */}
      {currentUser.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {branches.map((b) => (
                <div key={b.id}>
                  <label className="text-sm font-medium">{b.name} Goal</label>
                  <Input
                    type="number"
                    value={branchGoals[b.id] ?? ''}
                    onChange={(e) =>
                      setBranchGoals((prev) => ({ ...prev, [b.id]: e.target.value }))
                    }
                    min={0}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveGoals}>Save Goals</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin: Entries table (Delete/Restore) */}
      {currentUser.role === 'admin' && (
        <AdminEntries branches={branches} />
      )}

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {formatNumber(branches.reduce((s, b) => s + b.total, 0))}
            </div>
            <div className="text-sm text-muted-foreground">Regional Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{formatNumber(regionalGoal)}</div>
            <div className="text-sm text-muted-foreground">Regional Goal (sum)</div>
          </div>
          {myBranch ? (
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatNumber(myBranch.total)} / {formatNumber(myBranch.goal)}
              </div>
              <div className="text-sm text-muted-foreground">My Branch</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-2xl font-bold">{branches.length}</div>
              <div className="text-sm text-muted-foreground">Branches</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent entries (leaders/admin) */}
      {currentUser.role !== 'public' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Entries</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {visibleEntries.length === 0 ? (
              <div className="text-sm text-muted-foreground">No entries visible for your role.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Branch(es)</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleEntries
                    .slice(0, 20)
                    .map((e) => {
                      const total = e.allocations.reduce((s, a) => s + a.amount, 0);
                      const branchesText = e.allocations
                        .map((a) => branches.find((b) => b.id === a.branchId)?.name ?? a.branchId)
                        .join(', ');
                      return (
                        <TableRow key={e.id}>
                          <TableCell>{formatDate(e.timestamp)}</TableCell>
                          <TableCell>{branchesText}</TableCell>
                          <TableCell className="text-right">{formatNumber(total)}</TableCell>
                          <TableCell>{e.note ?? ''}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
