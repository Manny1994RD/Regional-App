import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import BranchPicker from '@/components/BranchPicker';
import { Branch, Badge as BadgeType } from '@/types';
import { SupabaseProvider } from '@/lib/dataProvider';
import { BadgeManager } from '@/lib/badges';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

// Literal class names so Tailwind keeps them in production
const chipColorMap: Record<string, string> = {
  santiago: 'bg-blue-500',
  jarabacoa: 'bg-green-500',
  la_vega: 'bg-purple-500',
  puerto_plata: 'bg-yellow-500',
  moca: 'bg-pink-500',
};

export default function Dashboard({ onNavigate }: DashboardProps) {
  const provider = useMemo(() => new SupabaseProvider(), []);
  const [badgeManager] = useState(() => new BadgeManager());

  const [branches, setBranches] = useState<Branch[]>([]);
  const [regionalGoal, setRegionalGoal] = useState(0);
  const [regionalBadges, setRegionalBadges] = useState<BadgeType[]>([]);
  const [weeklyHighlight, setWeeklyHighlight] = useState<string>('');
  const [showEntry, setShowEntry] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [b, goal, badges, highlight] = await Promise.all([
          provider.listBranches(),
          provider.getRegionalGoal(),
          badgeManager.getRegionalBadges(),
          badgeManager.getWeeklyHighlight(),
        ]);
        if (!cancelled) {
          setBranches(b);
          setRegionalGoal(goal);
          setRegionalBadges(badges);
          setWeeklyHighlight(highlight);
        }
      } catch (e) {
        console.error('Load error', e);
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [provider, badgeManager, refreshKey]);

  const totalRegional = branches.reduce((sum, b) => sum + b.total, 0);
  const remaining = Math.max(regionalGoal - totalRegional, 0);
  const pctRegional = regionalGoal > 0 ? (totalRegional / regionalGoal) * 100 : 0;

  // Santiago first, then alphabetical (no backend change required)
  const branchesSorted = useMemo(() => {
    return [...branches].sort((a, b) => {
      if (a.id === 'santiago') return -1;
      if (b.id === 'santiago') return 1;
      return a.name.localeCompare(b.name, 'es');
    });
  }, [branches]);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Top actions */}
      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          <Button variant="default" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
          <Button variant="outline" onClick={() => onNavigate('pin')}>Admin/Access</Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowEntry((s) => !s)}>
            {showEntry ? 'Hide Entry' : 'Add Entry'}
          </Button>
        </div>
      </div>

      {showEntry && (
        <Card>
          <CardContent className="pt-4">
            <BranchPicker
              key={refreshKey}
              onEntryAdded={() => refresh()}
              onNavigate={onNavigate}
            />
          </CardContent>
        </Card>
      )}

      {/* Top summary card */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-extrabold">El Pequeño Vendrá a ser 1,000</div>
            <div className="text-sm opacity-90">Meta Regional Tablero</div>
          </div>

          <div className="text-center">
            <div className="text-5xl font-extrabold leading-tight">
              {totalRegional.toLocaleString('es-DO')}
            </div>
            <div className="text-sm opacity-90">Total Regional</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-semibold">
              Restante: {remaining.toLocaleString('es-DO')}
            </div>
            <div className="text-sm opacity-90">
              Meta Regional: {regionalGoal.toLocaleString('es-DO')}
            </div>
          </div>

          <div>
            <Progress value={pctRegional} />
          </div>

          {regionalBadges.length > 0 && (
            <div className="flex justify-center flex-wrap gap-2">
              {regionalBadges.map((badge) => (
                <Badge key={badge.id} variant="secondary" className="bg-white/20">
                  {badge.icon} {badge.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {weeklyHighlight && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="text-center text-yellow-800 font-medium">
              {weeklyHighlight}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Branch cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {branchesSorted.map((b) => {
          const pctBranch = b.goal > 0 ? (b.total / b.goal) * 100 : 0;
          const pctRegionalBranch = regionalGoal ? Math.min((b.total / regionalGoal) * 100, 100) : 0;

          // Use literal-class fallback to avoid Tailwind purge issues
          const chipClass = chipColorMap[b.id] || b.color || 'bg-slate-500';

          return (
            <Card key={b.id} className="bg-white">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">{b.name}</div>

                  {/* Meta chip with tooltip and safe background color */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${chipClass} text-white cursor-default`}
                        role="status"
                        aria-label={`Meta de ${b.name}: ${b.goal.toLocaleString('es-DO')}`}
                      >
                        Meta {b.goal.toLocaleString('es-DO')}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span>Meta de {b.name}: {b.goal.toLocaleString('es-DO')}</span>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{b.total.toLocaleString('es-DO')}</div>
                    <div className="text-xs text-muted-foreground">Total sucursal</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{pctBranch.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">% de meta</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{pctRegionalBranch.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">% del objetivo regional</div>
                  </div>
                </div>

                <Progress value={pctBranch} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
