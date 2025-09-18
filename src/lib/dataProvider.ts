import { supabase } from '@/lib/supabase';
import type { Branch, Entry } from '@/types';

/**
 * SupabaseProvider
 * - Reads totals from `branch_totals` view
 * - Writes entries + entry_allocations
 * - Updates branch goals
 * - Lists & soft-deletes/restores entries
 * - HARD delete an entry (with cascade on allocations)
 */
export class SupabaseProvider {
  async listBranches(): Promise<Branch[]> {
    const { data, error } = await supabase.from('branch_totals').select('*');
    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.branch_id,
      name: r.name,
      color: r.color,
      goal: r.goal,
      total: r.total,
    }));
  }

  async getRegionalGoal(): Promise<number> {
    const b = await this.listBranches();
    return b.reduce((acc, x) => acc + (x.goal || 0), 0);
  }

  async updateBranchGoal(branchId: string, goal: number) {
    const { error } = await supabase.from('branches').update({ goal }).eq('id', branchId);
    if (error) throw error;
  }

  async addEntry(e: Entry) {
    // Insert entry
    const { data: entry, error } = await supabase
      .from('entries')
      .insert({
        timestamp: new Date(e.timestamp).toISOString(),
        note: e.note ?? null,
        is_deleted: false,
      })
      .select()
      .single();
    if (error) throw error;

    // Insert allocations
    const allocations = e.allocations.map((a) => ({
      entry_id: entry.id,
      branch_id: a.branchId,
      amount: a.amount,
    }));
    const { error: allocErr } = await supabase.from('entry_allocations').insert(allocations);
    if (allocErr) throw allocErr;
  }

  async listEntries(): Promise<Entry[]> {
    const { data, error } = await supabase
      .from('entries')
      .select(`
        id, timestamp, note, is_deleted,
        entry_allocations ( branch_id, amount )
      `)
      .order('timestamp', { ascending: false });
    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      timestamp: new Date(row.timestamp).getTime(),
      amount: (row.entry_allocations || []).reduce((s: number, a: any) => s + a.amount, 0),
      note: row.note || undefined,
      allocations: (row.entry_allocations || []).map((a: any) => ({
        branchId: a.branch_id,
        amount: a.amount,
      })),
      isDeleted: !!row.is_deleted,
      clientKey: row.id,
    }));
  }

  async softDeleteEntry(id: string) {
    const { error } = await supabase.from('entries').update({ is_deleted: true }).eq('id', id);
    if (error) throw error;
  }

  async restoreEntry(id: string) {
    const { error } = await supabase.from('entries').update({ is_deleted: false }).eq('id', id);
    if (error) throw error;
  }

  async hardDeleteEntry(id: string) {
    // Hard delete entry; allocations will be removed via ON DELETE CASCADE
    const { error } = await supabase.from('entries').delete().eq('id', id);
    if (error) throw error;
  }
}
