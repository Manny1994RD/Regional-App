import type { Branch, Entry, Badge as BadgeType } from '@/types';
import { SupabaseProvider } from '@/lib/dataProvider';

export interface BadgeRule {
  id: string;
  name: string;
  icon: string;
  description: string;
  isRegional?: boolean;
  check: (branch: Branch, entries: Entry[], allBranches: Branch[]) => boolean;
}

/**
 * Basic example rules. Adjust to your ministry logic.
 */
export const BADGE_RULES: BadgeRule[] = [
  {
    id: 'reach_goal',
    name: 'Meta Alcanzada',
    icon: '🏁',
    description: 'Sucursal alcanzó su meta.',
    check: (branch) => (branch.total ?? 0) >= (branch.goal ?? 0),
  },
  {
    id: 'half_way',
    name: '50% de Meta',
    icon: '🎯',
    description: 'Sucursal superó el 50% de su meta.',
    check: (branch) => (branch.goal ?? 0) > 0 && (branch.total ?? 0) >= 0.5 * (branch.goal ?? 0),
  },
  {
    id: 'strong_week_top',
    name: 'Sucursal de la Semana',
    icon: '🏆',
    description: 'Sucursal con mayor avance en los últimos 7 días.',
    check: (branch, entries, allBranches) => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const inc = (bId: string) =>
        entries
          .filter((e) => !e.isDeleted && e.timestamp >= weekAgo)
          .reduce((sum, e) => {
            const amt = e.allocations
              .filter((a) => a.branchId === bId)
              .reduce((s, a) => s + a.amount, 0);
            return sum + amt;
          }, 0);
      const branchInc = inc(branch.id);
      const maxInc = Math.max(...allBranches.map((b) => inc(b.id)));
      return branchInc > 0 && branchInc === maxInc;
    },
  },
];

/**
 * Supabase-backed BadgeManager
 * - getRegionalBadges(): returns unique badges achieved by any branch (deduped by id)
 * - getWeeklyHighlight(): returns a single line summary for last 7 days
 */
export class BadgeManager {
  private provider = new SupabaseProvider();

  async getRegionalBadges(): Promise<BadgeType[]> {
    const [branches, entries] = await Promise.all([
      this.provider.listBranches(),
      this.provider.listEntries(),
    ]);

    // For each branch, collect rules that pass
    const achieved = new Map<string, BadgeType>();
    for (const b of branches) {
      for (const rule of BADGE_RULES) {
        if (rule.check(b, entries, branches)) {
          if (!achieved.has(rule.id)) {
            achieved.set(rule.id, {
              id: rule.id,
              name: rule.name,
              icon: rule.icon,
            } as BadgeType);
          }
        }
      }
    }
    return Array.from(achieved.values());
  }

  async getWeeklyHighlight(): Promise<string> {
    const [branches, entries] = await Promise.all([
      this.provider.listBranches(),
      this.provider.listEntries(),
    ]);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const totals = branches.map((branch) => {
      const total = entries
        .filter((e) => !e.isDeleted && e.timestamp >= weekAgo)
        .reduce((sum, e) => {
          const amt = e.allocations
            .filter((a) => a.branchId === branch.id)
            .reduce((s, a) => s + a.amount, 0);
          return sum + amt;
        }, 0);
      return { branch: branch.name, total };
    });

    const strongest = totals.reduce((max, cur) => (cur.total > max.total ? cur : max), { branch: '', total: 0 });
    if (strongest.total > 0) {
      return `🏆 Semana más fuerte: ${strongest.branch} con ${strongest.total.toLocaleString('es-DO')}.`;
    }
    return '💪 ¡Vamos por una semana increíble!';
  }
}
