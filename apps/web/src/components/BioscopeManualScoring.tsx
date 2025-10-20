import React, { useState } from 'react';
import type { Team } from '@pkg/core';

interface ParticipantInfo {
  id: string;
  name: string;
  teamId?: string | null;
}

interface BioscopeManualScoringProps {
  teams: Team[];
  participants: ParticipantInfo[];
  onAwardPoints: (participantId: string, participantName: string, points: number, reason?: string) => void;
  quickPoints?: number[];
}

const DEFAULT_POINTS = [10, 20, 50, 100];

export const BioscopeManualScoring: React.FC<BioscopeManualScoringProps> = ({
  teams,
  participants,
  onAwardPoints,
  quickPoints = DEFAULT_POINTS,
}) => {
  const [selectedParticipant, setSelectedParticipant] = useState<string>('');
  const [customPoints, setCustomPoints] = useState<number>(0);
  const [reason, setReason] = useState<string>('');

  const handleAward = (points: number) => {
    if (!selectedParticipant) return;
    const participant = participants.find((p) => p.id === selectedParticipant);
    if (!participant) return;

    onAwardPoints(participant.id, participant.name, points, reason || undefined);
    setReason('');
    setCustomPoints(0);
  };

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-white text-lg font-semibold">Manual Scoring</h3>
          <p className="text-sm text-gray-400">Award points for voice answers or bonus rewards.</p>
        </div>
        <div className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm">Host Control</div>
      </header>

      {/* Participant Selector */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="bioscope-manual-participant" className="text-sm font-medium text-gray-300">
            Select Participant
          </label>
          <select
            id="bioscope-manual-participant"
            value={selectedParticipant}
            onChange={(e) => setSelectedParticipant(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="">-- Choose participant --</option>
            {teams.map((team) => {
              const teamParticipants = participants.filter((p) => p.teamId === team.id);
              if (teamParticipants.length === 0) return null;
              return (
                <optgroup key={team.id} label={team.name} className="bg-gray-900 text-gray-200">
                  {teamParticipants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
            {(() => {
              const unassignedParticipants = participants.filter(
                (p) => !p.teamId || !teams.some((team) => team.id === p.teamId)
              );
              if (unassignedParticipants.length === 0) return null;
              return (
                <optgroup key="unassigned" label="Unassigned" className="bg-gray-900 text-gray-200">
                  {unassignedParticipants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.name}
                    </option>
                  ))}
                </optgroup>
              );
            })()}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Reason (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Voice answer, bonus, etc."
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Quick Awards */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-300">Quick Awards</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {quickPoints.map((points) => (
            <button
              key={points}
              type="button"
              onClick={() => handleAward(points)}
              disabled={!selectedParticipant}
              className={`px-4 py-3 rounded-lg font-semibold transition-all border ${
                selectedParticipant
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
              }`}
            >
              +{points} pts
            </button>
          ))}
        </div>
      </div>

      {/* Custom Points */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Custom Points</label>
          <input
            type="number"
            min={0}
            value={customPoints || ''}
            onChange={(e) => setCustomPoints(Number(e.target.value))}
            placeholder="Enter points"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="button"
            onClick={() => customPoints > 0 && handleAward(customPoints)}
            disabled={!selectedParticipant || customPoints <= 0}
            className={`w-full h-full px-4 py-3 rounded-lg font-semibold transition-all ${
              selectedParticipant && customPoints > 0
                ? 'bg-amber-500 hover:bg-amber-400 text-gray-900 shadow-lg shadow-amber-500/30'
                : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
            }`}
          >
            Award {customPoints > 0 ? `+${customPoints}` : ''} points
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 bg-gray-900/80 border border-gray-800 rounded-lg p-3">
        💡 Manual scoring is perfect for in-person answers or additional rewards. All manual awards are logged with reasons.
      </p>
    </div>
  );
};
