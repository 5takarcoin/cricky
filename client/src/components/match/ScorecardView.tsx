import type { ScorecardInnings } from '../../types';
import { Card, CardBody } from '../ui';

export function ScorecardView({ innings }: { innings: ScorecardInnings[] }) {
  if (innings.length === 0) {
    return <p className="text-center text-pitch/50 py-8">No innings data yet.</p>;
  }

  return (
    <div className="space-y-8">
      {innings.map((inn) => (
        <Card key={inn.inning}>
          <CardBody>
            <h3 className="font-bold text-pitch text-lg mb-1">
              {inn.team.name} — {inn.score.runs}/{inn.score.wickets} ({inn.score.overs} ov)
            </h3>
            {inn.score.extras !== undefined && (
              <p className="text-sm text-pitch/50 mb-4">Extras: {inn.score.extras}</p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-pitch/50 border-b border-cream-dark">
                    <th className="pb-2 pr-4">Batsman</th>
                    <th className="pb-2 pr-4">How Out</th>
                    <th className="pb-2">R</th>
                    <th className="pb-2">B</th>
                    <th className="pb-2">4s</th>
                    <th className="pb-2">6s</th>
                    <th className="pb-2">SR</th>
                  </tr>
                </thead>
                <tbody>
                  {inn.batting.map((b) => (
                    <tr key={b.batsman.id} className="border-b border-cream-dark">
                      <td className="py-2 pr-4 font-medium">{b.batsman.name}</td>
                      <td className="py-2 pr-4 text-pitch/60 text-xs">{b.howOut}</td>
                      <td className="py-2">{b.runs}</td>
                      <td className="py-2">{b.balls}</td>
                      <td className="py-2">{b.fours}</td>
                      <td className="py-2">{b.sixes}</td>
                      <td className="py-2">{b.strikeRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto mt-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-pitch/50 border-b border-cream-dark">
                    <th className="pb-2 pr-4">Bowler</th>
                    <th className="pb-2">O</th>
                    <th className="pb-2">M</th>
                    <th className="pb-2">R</th>
                    <th className="pb-2">W</th>
                    <th className="pb-2">Econ</th>
                  </tr>
                </thead>
                <tbody>
                  {inn.bowling.map((b) => (
                    <tr key={b.bowler.id} className="border-b border-cream-dark">
                      <td className="py-2 pr-4 font-medium">{b.bowler.name}</td>
                      <td className="py-2">{b.overs}</td>
                      <td className="py-2">{b.maidens}</td>
                      <td className="py-2">{b.runs}</td>
                      <td className="py-2">{b.wickets}</td>
                      <td className="py-2">{b.economy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
