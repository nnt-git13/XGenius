import React, { useState, useEffect } from 'react';
import { apiClient, TeamEvaluateResponse } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

export default function DashboardPage() {
  const [evaluation, setEvaluation] = useState<TeamEvaluateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [squad, setSquad] = useState<Array<{ id: number }>>([]);

  useEffect(() => {
    // Load squad from store or API
    // For now, using empty squad
    loadEvaluation();
  }, []);

  const loadEvaluation = async () => {
    if (squad.length === 0) return;
    
    setLoading(true);
    try {
      const result = await apiClient.evaluateTeam({ squad, season: '2024-25' });
      setEvaluation(result);
    } catch (error) {
      console.error('Failed to evaluate team:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No team data available. Import your squad to get started.</p>
      </div>
    );
  }

  const chartData = evaluation.players.map(p => ({
    name: p.name.split(' ').pop(),
    predicted: p.predicted_points,
    current: p.current_points,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Your team's performance overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="XG Score"
          value={evaluation.xg_score.toFixed(1)}
          trend="up"
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
        />
        <MetricCard
          title="Predicted Points"
          value={evaluation.predicted_points.toFixed(1)}
          trend="up"
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <MetricCard
          title="Risk Score"
          value={(evaluation.risk_score * 100).toFixed(0) + '%'}
          trend={evaluation.risk_score > 0.6 ? 'down' : 'up'}
          icon={evaluation.risk_score > 0.6 ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          color={evaluation.risk_score > 0.6 ? 'red' : 'green'}
        />
        <MetricCard
          title="Fixture Difficulty"
          value={evaluation.fixture_difficulty.toFixed(1)}
          trend={evaluation.fixture_difficulty > 4 ? 'down' : 'up'}
          icon={<TrendingDown className="w-5 h-5" />}
          color={evaluation.fixture_difficulty > 4 ? 'orange' : 'blue'}
        />
      </div>

      {/* Recommendations */}
      {evaluation.recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-4 border border-purple-500/30">
          <h3 className="text-lg font-semibold text-white mb-2">Recommendations</h3>
          <ul className="space-y-1">
            {evaluation.recommendations.map((rec, idx) => (
              <li key={idx} className="text-gray-300 flex items-start gap-2">
                <span className="text-purple-400">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Player Performance Chart */}
      <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Player Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Bar dataKey="predicted" fill="#8B5CF6" name="Predicted" />
            <Bar dataKey="current" fill="#10B981" name="Current" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Player List */}
      <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Player Evaluations</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-4 text-gray-400">Player</th>
                <th className="text-left py-2 px-4 text-gray-400">Position</th>
                <th className="text-right py-2 px-4 text-gray-400">Predicted</th>
                <th className="text-right py-2 px-4 text-gray-400">Risk</th>
                <th className="text-left py-2 px-4 text-gray-400">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.players.map((player) => (
                <tr key={player.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 px-4 text-white">{player.name}</td>
                  <td className="py-3 px-4 text-gray-400">{player.position}</td>
                  <td className="py-3 px-4 text-right text-green-400 font-semibold">
                    {player.predicted_points.toFixed(1)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-2 py-1 rounded text-xs ${
                      player.risk_score > 0.6 ? 'bg-red-900/50 text-red-400' :
                      player.risk_score > 0.4 ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-green-900/50 text-green-400'
                    }`}>
                      {(player.risk_score * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      player.recommendation === 'captain' ? 'bg-purple-900/50 text-purple-400' :
                      player.recommendation === 'keep' ? 'bg-green-900/50 text-green-400' :
                      player.recommendation === 'sell' ? 'bg-red-900/50 text-red-400' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {player.recommendation.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, icon, color }: {
  title: string;
  value: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
  color: string;
}) {
  const colorClasses = {
    purple: 'from-purple-600 to-purple-800',
    green: 'from-green-600 to-green-800',
    red: 'from-red-600 to-red-800',
    orange: 'from-orange-600 to-orange-800',
    blue: 'from-blue-600 to-blue-800',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} rounded-lg p-4 border border-${color}-500/30`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-300 text-sm">{title}</span>
        <div className="text-white">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

