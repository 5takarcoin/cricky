import type { LiveSummary, EndedSummary } from '../../types';
import { Card, CardBody } from '../ui';

type Props = {
  summary: LiveSummary | EndedSummary | { status: 'scheduled'; scheduledAt?: string };
};

export function LiveSummaryView({ summary }: Props) {
  if (summary.status === 'scheduled') {
    return (
      <Card>
        <CardBody>
          <p className="text-pitch/60">Match scheduled. Start the match to begin scoring.</p>
        </CardBody>
      </Card>
    );
  }

  if (summary.status === 'ended') {
    const ended = summary as EndedSummary;
    return (
      <div className="space-y-4">
        {ended.winner && (
          <Card>
            <CardBody>
              <p className="font-semibold text-pitch text-lg">Winner: {ended.winner.name}</p>
              <p className="text-pitch/60 text-sm capitalize">{ended.result.replace(/_/g, ' ')}</p>
            </CardBody>
          </Card>
        )}
        {ended.innings.map((inn) => (
          <Card key={inn.inning}>
            <CardBody className="flex justify-between items-center">
              <span className="font-medium text-lg">{inn.team.name}</span>
              <span className="text-2xl font-bold text-pitch">
                {inn.score.runs}/{inn.score.wickets}
                <span className="text-base font-normal text-pitch/50 ml-2">({inn.score.overs} ov)</span>
              </span>
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  const live = summary as LiveSummary;
  const battingTeam = live.innings?.find((i) => i.isLive)?.team ?? live.team1;

  return (
    <div className="space-y-4">
      {live.innings && live.innings.length > 0 ? (
        <Card>
          <CardBody className="space-y-4">
            {live.innings.map((inn) => (
              <div key={inn.inning} className="flex justify-between items-center">
                <span className={`font-semibold text-lg ${inn.isLive ? 'text-pitch' : 'text-pitch/60'}`}>
                  {inn.team.name.toUpperCase()}
                  {inn.isLive && <span className="text-gold ml-1">*</span>}
                </span>
                <span className={`text-xl font-bold ${inn.isLive ? 'text-pitch' : 'text-pitch/60'}`}>
                  {inn.score.runs}/{inn.score.wickets}
                  <span className="text-sm font-normal ml-1">({inn.score.overs})</span>
                </span>
              </div>
            ))}
            {live.team1 && live.team2 && (
              <p className="text-center text-pitch/40 text-sm">vs</p>
            )}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="text-center">
            <p className="text-sm text-pitch/50 uppercase">Innings {live.inning}</p>
            <p className="text-4xl font-bold text-pitch mt-1">
              {battingTeam?.name?.toUpperCase()} {live.score.runs}/{live.score.wickets}
            </p>
            <p className="text-pitch/60">{live.score.overs} overs</p>
          </CardBody>
        </Card>
      )}

      {live.currentBatsmen.length > 0 && (
        <Card>
          <CardBody>
            <h3 className="text-sm font-semibold text-pitch/50 uppercase mb-3">Batting</h3>
            <div className="space-y-2">
              {live.currentBatsmen.map((b, i) => (
                <div key={i} className="flex justify-between">
                  <span className="font-medium">
                    {b.name ?? '—'}
                    {b.isStriker !== false && i === 0 ? '*' : ''}
                  </span>
                  <span>{b.runs}({b.balls})</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {live.currentBowler && (
        <Card>
          <CardBody>
            <h3 className="text-sm font-semibold text-pitch/50 uppercase mb-2">Bowling</h3>
            <div className="flex justify-between">
              <span className="font-medium">{live.currentBowler.name}</span>
              <span className="text-pitch/70">
                {live.currentBowler.overs}-{live.currentBowler.runs}-{live.currentBowler.wickets}
              </span>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
