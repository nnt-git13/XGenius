import React, { useState } from 'react';
import { apiClient, OptimizeRequest, OptimizeResponse } from '../lib/api';
import { Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OptimizerPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [formData, setFormData] = useState<OptimizeRequest>({
    season: '2024-25',
    budget: 100.0,
    horizon: 1,
    risk_tolerance: 0.5,
    max_players_per_team: 3,
  });

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const response = await apiClient.optimizeSquad(formData);
      setResult(response);
    } catch (error) {
      console.error('Optimization failed:', error);
      alert('Optimization failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-purple-400" />
          Squad Optimizer
        </h1>
        <p className="text-gray-400">AI-powered squad optimization with ML predictions</p>
      </div>

      {/* Configuration Panel */}
      <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg p-6 border border-purple-500/30">
        <h2 className="text-xl font-semibold text-white mb-4">Optimization Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Budget (£m)</label>
            <input
              type="number"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              min="0"
              max="200"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Horizon (GWs)</label>
            <input
              type="number"
              value={formData.horizon}
              onChange={(e) => setFormData({ ...formData, horizon: parseInt(e.target.value) })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              min="1"
              max="5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Risk Tolerance</label>
            <input
              type="range"
              value={formData.risk_tolerance}
              onChange={(e) => setFormData({ ...formData, risk_tolerance: parseFloat(e.target.value) })}
              className="w-full"
              min="0"
              max="1"
              step="0.1"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Conservative</span>
              <span>Aggressive</span>
            </div>
          </div>
        </div>

        {/* Chip Options */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Chips</label>
          <div className="flex flex-wrap gap-4">
            {[
              { key: 'use_wildcard', label: 'Wildcard' },
              { key: 'use_free_hit', label: 'Free Hit' },
              { key: 'use_bench_boost', label: 'Bench Boost' },
              { key: 'use_triple_captain', label: 'Triple Captain' },
            ].map((chip) => (
              <label key={chip.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData[chip.key as keyof OptimizeRequest] as boolean}
                  onChange={(e) => setFormData({ ...formData, [chip.key]: e.target.checked })}
                  className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-700 rounded focus:ring-purple-500"
                />
                <span className="text-gray-300">{chip.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleOptimize}
          disabled={loading}
          className="mt-6 w-full md:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Optimize Squad
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="Total Cost" value={`£${result.total_cost.toFixed(1)}m`} color="blue" />
            <StatCard title="XG Score" value={result.xg_score.toFixed(1)} color="purple" />
            <StatCard title="Predicted Points" value={result.predicted_points.toFixed(1)} color="green" />
            <StatCard title="Risk Score" value={`${(result.risk_score * 100).toFixed(0)}%`} color="orange" />
          </div>

          {/* Starting XI */}
          <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-800">
            <h3 className="text-xl font-semibold text-white mb-4">
              Starting XI - {result.formation}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.starting_xi.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </div>
          </div>

          {/* Bench */}
          {result.bench.length > 0 && (
            <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-800">
              <h3 className="text-xl font-semibold text-white mb-4">Bench</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {result.bench.map((player) => (
                  <PlayerCard key={player.id} player={player} />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-800 border-blue-500/30',
    purple: 'from-purple-600 to-purple-800 border-purple-500/30',
    green: 'from-green-600 to-green-800 border-green-500/30',
    orange: 'from-orange-600 to-orange-800 border-orange-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} rounded-lg p-4 border`}>
      <div className="text-sm text-gray-300 mb-1">{title}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function PlayerCard({ player }: { player: any }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-purple-500/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-white">{player.name}</div>
          <div className="text-sm text-gray-400">{player.team} • {player.position}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-green-400">£{player.price.toFixed(1)}m</div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
        <div className="text-xs text-gray-400">Predicted</div>
        <div className="text-sm font-semibold text-purple-400">{player.predicted_points?.toFixed(1) || 'N/A'}</div>
      </div>
    </div>
  );
}

