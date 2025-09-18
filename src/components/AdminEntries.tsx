import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SupabaseProvider } from '@/lib/dataProvider';
import type { Branch, Entry } from '@/types';

interface Props {
  branches: Branch[];
}

export default function AdminEntries({ branches }: Props) {
  const provider = useMemo(() => new SupabaseProvider(), []);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const e = await provider.listEntries();
      setEntries(e);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const formatNumber = (n: number) => n.toLocaleString('es-DO');
  const formatDate = (timestamp: number) =>
    new Intl.DateTimeFormat('es-DO', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Santo_Domingo',
    }).format(timestamp);

  const handleSoftDelete = async (id: string) => {
    await provider.softDeleteEntry(id);
    toast.success('Entry moved to Deleted');
    load();
  };

  const handleRestore = async (id: string) => {
    await provider.restoreEntry(id);
    toast.success('Entry restored');
    load();
  };

  const handleHardDelete = async (id: string) => {
    if (!confirm('Delete permanently? This cannot be undone.')) return;
    await provider.hardDeleteEntry(id);
    toast.success('Entry permanently deleted');
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin: All Entries</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="text-sm text-muted-foreground">No entries yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Branch(es)</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.slice(0, 100).map((e) => {
                const total = e.allocations.reduce((s, a) => s + a.amount, 0);
                const branchesText = e.allocations
                  .map((a) => branches.find((b) => b.id === a.branchId)?.name ?? a.branchId)
                  .join(', ');
                return (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.timestamp)}</TableCell>
                    <TableCell>{branchesText}</TableCell>
                    <TableCell className="text-right">{formatNumber(total)}</TableCell>
                    <TableCell>{e.isDeleted ? 'Deleted' : 'Active'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {!e.isDeleted ? (
                        <Button variant="destructive" onClick={() => handleSoftDelete(e.id)}>
                          Delete
                        </Button>
                      ) : (
                        <>
                          <Button variant="outline" onClick={() => handleRestore(e.id)}>Restore</Button>
                          <Button variant="destructive" onClick={() => handleHardDelete(e.id)}>
                            Delete Permanently
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
