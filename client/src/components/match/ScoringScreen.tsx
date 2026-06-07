import { useState } from 'react';
import * as api from '../../api';
import { ApiError } from '../../api/client';
import type { Match, LiveSummary, InningsScore } from '../../types';
import {
  buildRunPayload, buildExtraPayload, buildWicketPayload,
  rotateStrike, rotateStrikeAfterWicket, ballDisplaySymbol,
  type DeliveryPayload, type ExtraType, type SquadPlayer,
} from '../../lib/scoring';
import { Card, CardBody, Button, Select, Alert } from '../ui';

type Panel =
  | null
  | { type: 'wide' }
  | { type: 'no_ball' }
  | { type: 'bye' }
  | { type: 'leg_bye' }
  | { type: 'wicket'; step: 'type' }
  | { type: 'wicket'; step: 'details'; wicketType: string };

const WICKET_TYPES = [
  { id: 'bowled', label: 'Bowled', needsFielder: false },
  { id: 'caught', label: 'Caught', needsFielder: true },
  { id: 'lbw', label: 'LBW', needsFielder: false },
  { id: 'run_out', label: 'Run Out', needsFielder: true },
  { id: 'stumped', label: 'Stumped', needsFielder: true },
  { id: 'hit_wicket', label: 'Hit Wicket', needsFielder: false },
] as const;

interface Props {
  match: Match;
  battingSquad: SquadPlayer[];
  bowlingSquad: SquadPlayer[];
  initialSummary: LiveSummary | null;
  onSummaryChange: (s: LiveSummary) => void;
  onInningsOver: (inning: number, score: InningsScore) => void;
  onMatchEnded: () => void;
}

function initBatsmanStats(s: LiveSummary | null) {
  const stats: Record<number, { runs: number; balls: number }> = {};
  s?.currentBatsmen.forEach((b) => { if (b.id) stats[b.id] = { runs: b.runs, balls: b.balls }; });
  return stats;
}

function RunBtn({ n, onClick, disabled }: { n: number; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-w- h-12 rounded-lg bg-pitch text-white font-bold text-lg hover:bg-pitch-light disabled:opacity-40 transition-colors"
    >
      {n}
    </button>
  );
}

export function ScoringScreen({
  match,
  battingSquad,
  bowlingSquad,
  initialSummary,
  onSummaryChange,
  onInningsOver,
  onMatchEnded,
}: Props) {
  const [inning, setInning]               = useState(initialSummary?.inning ?? 1);
  const [score, setScore]                 = useState<InningsScore>(initialSummary?.score ?? { runs: 0, wickets: 0, overs: '0.0' });
  const [strikerId, setStrikerId]         = useState<number | ''>(initialSummary?.currentBatsmen[0]?.id ?? '');
  const [nonStrikerId, setNonStrikerId]   = useState<number | ''>(initialSummary?.currentBatsmen[1]?.id ?? '');
  const [bowlerId, setBowlerId]           = useState<number | ''>(initialSummary?.currentBowler?.id ?? '');
  const [batsmanStats, setBatsmanStats]   = useState(initBatsmanStats(initialSummary));
  const [bowlerStats, setBowlerStats]     = useState(
    initialSummary?.currentBowler
      ? { runs: initialSummary.currentBowler.runs, wickets: initialSummary.currentBowler.wickets, overs: initialSummary.currentBowler.overs }
      : null,
  );
  const [overBalls, setOverBalls]         = useState<string[]>([]);
  const [panel, setPanel]                 = useState<Panel>(null);
  const [error, setError]                 = useState('');
  const [submitting, setSubmitting]       = useState(false);

  const battingTeam = inning === 1 ? match.team1 : match.team2;

  const applySummary = (s: LiveSummary) => {
    setInning(s.inning);
    setScore(s.score);
    if (s.currentBatsmen[0]?.id) setStrikerId(s.currentBatsmen[0].id);
    if (s.currentBatsmen[1]?.id) setNonStrikerId(s.currentBatsmen[1].id);
    if (s.currentBowler?.id) setBowlerId(s.currentBowler.id);
    setBatsmanStats(initBatsmanStats(s));
    setBowlerStats(s.currentBowler
      ? { runs: s.currentBowler.runs, wickets: s.currentBowler.wickets, overs: s.currentBowler.overs }
      : null);
  };

  const ctx = () => ({
    inning,
    strikerId: Number(strikerId),
    nonStrikerId: Number(nonStrikerId),
    bowlerId: Number(bowlerId),
  });

  const canScore = strikerId && nonStrikerId && bowlerId && !submitting;

  const send = async (payload: DeliveryPayload) => {
    if (!canScore) {
      setError('Select striker, non-striker, and bowler first');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await api.recordDelivery(match.id, payload);
      setScore(res.currentScore);
      setOverBalls((prev) => [...prev, ballDisplaySymbol(res.delivery)]);

      const d = res.delivery;
      if (d.wicketType && d.playerDismissedId && d.nextBatterId) {
        const rotated = rotateStrikeAfterWicket(
          Number(strikerId), Number(nonStrikerId),
          d.playerDismissedId, d.nextBatterId,
          d.runsFromBat, d.ball,
        );
        setStrikerId(rotated.strikerId);
        setNonStrikerId(rotated.nonStrikerId);
        if (rotated.endOfOver) {
          setOverBalls([]);
          setBowlerId('');
        }
      } else {
        const rotated = rotateStrike(
          Number(strikerId), Number(nonStrikerId),
          d.runsFromBat, d.isLegalBall, d.ball,
        );
        setStrikerId(rotated.strikerId);
        setNonStrikerId(rotated.nonStrikerId);
        if (rotated.endOfOver) {
          setOverBalls([]);
          setBowlerId('');
        }
      }

      const summary = await api.getMatchSummary(match.id);
      if (summary.status === 'live') {
        onSummaryChange(summary);
        applySummary(summary);
      }

      if (res.inningsOver) {
        onInningsOver(inning, res.currentScore);
        if (res.matchEnded) {
          onMatchEnded();
        } else if (inning === 1) {
          setInning(2);
          setStrikerId('');
          setNonStrikerId('');
          setBowlerId('');
          setOverBalls([]);
          setBatsmanStats({});
          setBowlerStats(null);
          setScore({ runs: 0, wickets: 0, overs: '0.0' });
        }
      } else if (res.matchEnded) {
        onMatchEnded();
      }

      setPanel(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUndo = async () => {
    setError('');
    setSubmitting(true);
    try {
      await api.undoLastDelivery(match.id);
      setOverBalls((prev) => prev.slice(0, -1));
      const summary = await api.getMatchSummary(match.id);
      if (summary.status === 'live') {
        onSummaryChange(summary);
        applySummary(summary);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nothing to undo');
    } finally {
      setSubmitting(false);
    }
  };

  const striker = battingSquad.find((p) => p.id === Number(strikerId));
  const nonStriker = battingSquad.find((p) => p.id === Number(nonStrikerId));
  const bowler = bowlingSquad.find((p) => p.id === Number(bowlerId));

  const dismissedOptions = [striker, nonStriker].filter(Boolean) as SquadPlayer[];
  const remainingBatters = battingSquad.filter(
    (p) => p.id !== Number(strikerId) && p.id !== Number(nonStrikerId),
  );

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {error && <Alert>{error}</Alert>}

      {/* Scoreboard */}
      <Card>
        <CardBody>
          <div className="text-center mb-4">
            <p className="text-xs uppercase tracking-widest text-pitch/50">
              {battingTeam?.name ?? 'Batting'} · Inn {inning}
            </p>
            <p className="text-3xl font-bold text-pitch">
              {score.runs}/{score.wickets}
              <span className="text-lg font-normal text-pitch/50 ml-2">({score.overs} ov)</span>
            </p>
          </div>

          <div className="space-y-2 text-sm border-t border-cream-dark pt-3">
            <div className="flex justify-between">
              <span>Striker: <strong>{striker?.name ?? '—'}</strong>{strikerId ? '*' : ''}</span>
              <span>{batsmanStats[Number(strikerId)] ? `${batsmanStats[Number(strikerId)].runs}(${batsmanStats[Number(strikerId)].balls})` : ''}</span>
            </div>
            <div className="flex justify-between">
              <span>Non-striker: <strong>{nonStriker?.name ?? '—'}</strong></span>
              <span>{batsmanStats[Number(nonStrikerId)] ? `${batsmanStats[Number(nonStrikerId)].runs}(${batsmanStats[Number(nonStrikerId)].balls})` : ''}</span>
            </div>
            <div className="flex justify-between">
              <span>Bowler: <strong>{bowler?.name ?? '—'}</strong></span>
              <span>{bowlerStats ? `${bowlerStats.overs}-${bowlerStats.runs}-${bowlerStats.wickets}` : ''}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-cream-dark">
            <p className="text-xs text-pitch/50 uppercase mb-2">This over</p>
            <div className="flex flex-wrap gap-2 font-mono text-sm">
              {overBalls.map((b, i) => (
                <span key={i} className="w-7 h-7 rounded-full bg-cream flex items-center justify-center font-semibold">{b}</span>
              ))}
              <span className="w-7 h-7 rounded-full border border-dashed border-pitch/30 flex items-center justify-center text-pitch/30">_</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Player selectors */}
      <Card>
        <CardBody className="space-y-3">
          <Select label="Striker" value={strikerId} onChange={(e) => setStrikerId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Select striker</option>
            {battingSquad.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select label="Non-striker" value={nonStrikerId} onChange={(e) => setNonStrikerId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Select non-striker</option>
            {battingSquad.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select label="Bowler" value={bowlerId} onChange={(e) => setBowlerId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Select bowler</option>
            {bowlingSquad.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </CardBody>
      </Card>

      {/* Run buttons */}
      <div>
        <p className="text-xs font-semibold text-pitch/50 uppercase mb-2 text-center">Runs</p>
        <div className="flex flex-wrap justify-center gap-2">
          {[0, 1, 2, 3, 4, 6].map((n) => (
            <RunBtn key={n} n={n} disabled={!canScore} onClick={() => send(buildRunPayload(n, ctx()))} />
          ))}
        </div>
      </div>

      {/* Extras */}
      <div>
        <p className="text-xs font-semibold text-pitch/50 uppercase mb-2 text-center">Extras</p>
        <div className="flex flex-wrap justify-center gap-2">
          {(['wide', 'no_ball', 'bye', 'leg_bye'] as const).map((t) => (
            <Button key={t} variant="secondary" disabled={!canScore} onClick={() => setPanel({ type: t })}>
              {t === 'no_ball' ? 'No Ball' : t === 'leg_bye' ? 'Leg Bye' : t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Wicket + Undo */}
      <div className="flex justify-center gap-4">
        <Button variant="danger" className="min-w-20 h-12 text-lg font-bold" disabled={!canScore} onClick={() => setPanel({ type: 'wicket', step: 'type' })}>
          W
        </Button>
        <Button variant="ghost" disabled={submitting} onClick={handleUndo}>↩ Undo</Button>
      </div>

      {/* Extra panels */}
      {panel?.type === 'wide' && (
        <PanelBox title="Wide — additional runs?" onClose={() => setPanel(null)}>
          <p className="text-sm text-pitch/60 mb-3">Standard wide = 1 extra. Tap 0 for a normal wide.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[0, 1, 2, 3, 4].map((add) => (
              <RunBtn key={add} n={add} onClick={() => send(buildExtraPayload('wide', 1 + add, 0, ctx()))} />
            ))}
          </div>
        </PanelBox>
      )}

      {panel?.type === 'no_ball' && (
        <PanelBox title="No Ball" onClose={() => setPanel(null)}>
          <p className="text-sm text-pitch/60 mb-2">Runs off the bat?</p>
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {[0, 1, 2, 3, 4, 6].map((n) => (
              <RunBtn key={n} n={n} onClick={() => send(buildExtraPayload('no_ball', 1, n, ctx()))} />
            ))}
          </div>
          <Button variant="ghost" className="w-full" onClick={() => send(buildExtraPayload('no_ball', 1, 0, ctx()))}>
            Bye off no ball (0 off bat)
          </Button>
        </PanelBox>
      )}

      {(panel?.type === 'bye' || panel?.type === 'leg_bye') && (
        <PanelBox title={panel.type === 'bye' ? 'Bye' : 'Leg Bye'} onClose={() => setPanel(null)}>
          <p className="text-sm text-pitch/60 mb-3">How many runs?</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[1, 2, 3, 4].map((n) => (
              <RunBtn key={n} n={n} onClick={() => send(buildExtraPayload(panel.type as ExtraType, n, 0, ctx()))} />
            ))}
          </div>
        </PanelBox>
      )}

      {/* Wicket panel */}
      {panel?.type === 'wicket' && panel.step === 'type' && (
        <PanelBox title="How was the batter out?" onClose={() => setPanel(null)}>
          <div className="grid grid-cols-2 gap-2">
            {WICKET_TYPES.map((w) => (
              <Button key={w.id} variant="secondary" onClick={() => setPanel({ type: 'wicket', step: 'details', wicketType: w.id })}>
                {w.label}
              </Button>
            ))}
          </div>
        </PanelBox>
      )}

      {panel?.type === 'wicket' && panel.step === 'details' && (
        <WicketDetailsPanel
          wicketType={panel.wicketType}
          dismissedOptions={dismissedOptions}
          remainingBatters={remainingBatters}
          bowlingSquad={bowlingSquad}
          onClose={() => setPanel(null)}
          onConfirm={(details) => send(buildWicketPayload(ctx(), details))}
        />
      )}
    </div>
  );
}

function PanelBox({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <Card className="border-gold/50">
      <CardBody>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-pitch">{title}</h3>
          <button type="button" onClick={onClose} className="text-pitch/50 hover:text-pitch text-sm">✕</button>
        </div>
        {children}
      </CardBody>
    </Card>
  );
}

function WicketDetailsPanel({
  wicketType,
  dismissedOptions,
  remainingBatters,
  bowlingSquad,
  onClose,
  onConfirm,
}: {
  wicketType: string;
  dismissedOptions: SquadPlayer[];
  remainingBatters: SquadPlayer[];
  bowlingSquad: SquadPlayer[];
  onClose: () => void;
  onConfirm: (d: { wicketType: string; playerDismissedId: number; fielderId?: number | null; nextBatterId: number; runsFromBat: number }) => void;
}) {
  const wt = WICKET_TYPES.find((w) => w.id === wicketType);
  const needsFielder = wt?.needsFielder ?? false;

  const [dismissedId, setDismissedId] = useState(dismissedOptions[0]?.id ?? '');
  const [fielderId, setFielderId]     = useState<number | ''>('');
  const [nextBatterId, setNextBatter] = useState<number | ''>('');
  const [runsBefore, setRunsBefore]   = useState(0);

  return (
    <PanelBox title={`Wicket — ${wt?.label}`} onClose={onClose}>
      <div className="space-y-3">
        <Select label="Who got out?" value={dismissedId} onChange={(e) => setDismissedId(Number(e.target.value))}>
          {dismissedOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>

        {needsFielder && (
          <Select label={wicketType === 'stumped' ? 'Stumped by (keeper)' : wicketType === 'run_out' ? 'Run out by' : 'Fielder'} value={fielderId} onChange={(e) => setFielderId(Number(e.target.value))}>
            <option value="">Select fielder</option>
            {bowlingSquad.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        )}

        <div>
          <p className="text-sm font-medium text-pitch mb-2">Runs before wicket?</p>
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((n) => (
              <RunBtn key={n} n={n} onClick={() => setRunsBefore(n)} />
            ))}
          </div>
        </div>

        <Select label="Next batsman" value={nextBatterId} onChange={(e) => setNextBatter(Number(e.target.value))}>
          <option value="">Select batter</option>
          {remainingBatters.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>

        <Button
          className="w-full"
          variant="secondary"
          disabled={!dismissedId || !nextBatterId || (needsFielder && !fielderId)}
          onClick={() => onConfirm({
            wicketType,
            playerDismissedId: Number(dismissedId),
            fielderId: needsFielder ? Number(fielderId) : null,
            nextBatterId: Number(nextBatterId),
            runsFromBat: runsBefore,
          })}
        >
          Confirm wicket
        </Button>
      </div>
    </PanelBox>
  );
}
