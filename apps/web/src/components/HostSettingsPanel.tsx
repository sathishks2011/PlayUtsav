import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import type { RootState } from '../store/store';
import {
  setBuzzerEnabled,
  setTimerSeconds,
  setExplainAudioUrl,
  setMasterVolume,
  setSoundsEnabled,
  setCoinSoundEnabled,
  setBuzzerSoundEnabled,
  setBackgroundMusicEnabled,
  setNotificationSoundsEnabled,
  setAnimationsEnabled,
  setReduceMotion,
  setAutoDetectPerformance,
  setAutoRevealEnabled,
  setAutoRevealTimeout,
} from '../store/slices/settingsSlice';

export function HostSettingsPanel() {
  const dispatch = useDispatch();
  
  // Quiz settings
  const timer = useSelector((s: RootState) => s.settings.timerSeconds);
  const buzzer = useSelector((s: RootState) => s.settings.buzzerEnabled);
  const explain = useSelector((s: RootState) => s.settings.explainAudioUrl);
  
  // Sound settings
  const sounds = useSelector((s: RootState) => s.settings.sounds);
  
  // Animation settings
  const animations = useSelector((s: RootState) => s.settings.animations);
  
  // Reveal settings
  const reveal = useSelector((s: RootState) => s.settings.reveal);
  
  // Section collapse state
  const [expandedSections, setExpandedSections] = useState({
    quiz: true,
    sounds: false,
    animations: false,
    reveal: false,
  });
  
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      {/* Quiz Settings */}
      <div className="rounded-lg border border-[var(--fg)]/10 bg-[var(--card)] overflow-hidden">
        <button
          onClick={() => toggleSection('quiz')}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5"
          title="Toggle quiz settings"
        >
          <h3 className="text-lg font-semibold">
            <FormattedMessage id="host.settings.quiz.title" defaultMessage="Quiz Settings" />
          </h3>
          <span className="text-xl">{expandedSections.quiz ? '−' : '+'}</span>
        </button>
        {expandedSections.quiz && (
          <div className="px-4 pb-4 space-y-3">
            <label className="block text-sm space-y-1">
              <span><FormattedMessage id="host.settings.timer" defaultMessage="Default timer (seconds)" /></span>
              <input
                type="number"
                min={5}
                max={300}
                value={timer}
                onChange={(e) => dispatch(setTimerSeconds(Number(e.target.value)))}
                className="w-40 px-3 py-2 rounded border border-[var(--fg)]/20 bg-[var(--bg)]"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={buzzer}
                onChange={(e) => dispatch(setBuzzerEnabled(e.target.checked))}
              />
              <span><FormattedMessage id="host.settings.buzzer" defaultMessage="Enable buzzer sound" /></span>
            </label>
            <label className="block text-sm space-y-1">
              <span><FormattedMessage id="host.settings.explainAudio" defaultMessage="Explanation audio URL" /></span>
              <input
                value={explain ?? ''}
                onChange={(e) => dispatch(setExplainAudioUrl(e.target.value || null))}
                placeholder="https://.../explain.mp3"
                className="w-full px-3 py-2 rounded border border-[var(--fg)]/20 bg-[var(--bg)]"
              />
            </label>
          </div>
        )}
      </div>

      {/* Sound Settings */}
      <div className="rounded-lg border border-[var(--fg)]/10 bg-[var(--card)] overflow-hidden">
        <button
          onClick={() => toggleSection('sounds')}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5"
          title="Toggle sound settings"
        >
          <h3 className="text-lg font-semibold">
            <FormattedMessage id="host.settings.sounds.title" defaultMessage="Sound Settings" />
          </h3>
          <span className="text-xl">{expandedSections.sounds ? '−' : '+'}</span>
        </button>
        {expandedSections.sounds && (
          <div className="px-4 pb-4 space-y-4">
            {/* Master Controls */}
            <div className="space-y-3 pb-3 border-b border-[var(--fg)]/10">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={sounds.soundsEnabled}
                  onChange={(e) => dispatch(setSoundsEnabled(e.target.checked))}
                />
                <span><FormattedMessage id="host.settings.sounds.master" defaultMessage="Enable all sounds" /></span>
              </label>
              <label className="block text-sm space-y-1">
                <span><FormattedMessage id="host.settings.sounds.volume" defaultMessage="Master volume" /></span>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sounds.masterVolume}
                    onChange={(e) => dispatch(setMasterVolume(Number(e.target.value)))}
                    className="flex-1"
                    disabled={!sounds.soundsEnabled}
                  />
                  <span className="text-sm w-12 text-right">{sounds.masterVolume}%</span>
                </div>
              </label>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { SoundManager } = await import('../lib/soundManager');
                    const manager = SoundManager.getInstance();
                    await manager.playSound('coin', sounds.masterVolume / 100);
                    console.log('Test sound played: coin');
                  } catch (error) {
                    console.error('Failed to play test sound:', error);
                    alert('Failed to play sound. Please check:\n1. Sound files exist in public/sounds/\n2. Sounds are enabled\n3. Browser console for errors');
                  }
                }}
                disabled={!sounds.soundsEnabled}
                className="px-4 py-2 rounded bg-blue-500/20 border border-blue-400/40 text-blue-200 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                title="Test coin sound"
              >
                🔊 <FormattedMessage id="host.settings.sounds.testSound" defaultMessage="Test Sound (Coin)" />
              </button>
            </div>

            {/* Quiz Sounds */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium opacity-80">
                <FormattedMessage id="host.settings.sounds.quiz" defaultMessage="Quiz Sounds" />
              </h4>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sounds.coinSoundEnabled}
                  onChange={(e) => dispatch(setCoinSoundEnabled(e.target.checked))}
                  disabled={!sounds.soundsEnabled}
                />
                <span><FormattedMessage id="host.settings.sounds.coin" defaultMessage="Coin/correct answer sound" /></span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sounds.buzzerSoundEnabled}
                  onChange={(e) => dispatch(setBuzzerSoundEnabled(e.target.checked))}
                  disabled={!sounds.soundsEnabled}
                />
                <span><FormattedMessage id="host.settings.sounds.buzzerTimer" defaultMessage="Buzzer on timer expiry" /></span>
              </label>
            </div>

            {/* Game Sounds */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium opacity-80">
                <FormattedMessage id="host.settings.sounds.game" defaultMessage="Game Sounds" />
              </h4>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sounds.backgroundMusicEnabled}
                  onChange={(e) => dispatch(setBackgroundMusicEnabled(e.target.checked))}
                  disabled={!sounds.soundsEnabled}
                />
                <span><FormattedMessage id="host.settings.sounds.background" defaultMessage="Background music" /></span>
              </label>
            </div>

            {/* Notification Sounds */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium opacity-80">
                <FormattedMessage id="host.settings.sounds.notifications" defaultMessage="Notification Sounds" />
              </h4>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sounds.notificationSoundsEnabled}
                  onChange={(e) => dispatch(setNotificationSoundsEnabled(e.target.checked))}
                  disabled={!sounds.soundsEnabled}
                />
                <span><FormattedMessage id="host.settings.sounds.notificationJoin" defaultMessage="Player joins & team assignments" /></span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Animation Settings */}
      <div className="rounded-lg border border-[var(--fg)]/10 bg-[var(--card)] overflow-hidden">
        <button
          onClick={() => toggleSection('animations')}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5"
          title="Toggle animation settings"
        >
          <h3 className="text-lg font-semibold">
            <FormattedMessage id="host.settings.animations.title" defaultMessage="Animation Settings" />
          </h3>
          <span className="text-xl">{expandedSections.animations ? '−' : '+'}</span>
        </button>
        {expandedSections.animations && (
          <div className="px-4 pb-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={animations.animationsEnabled}
                onChange={(e) => dispatch(setAnimationsEnabled(e.target.checked))}
              />
              <span><FormattedMessage id="host.settings.animations.enable" defaultMessage="Enable animations" /></span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={animations.reduceMotion}
                onChange={(e) => dispatch(setReduceMotion(e.target.checked))}
                disabled={!animations.animationsEnabled}
              />
              <span><FormattedMessage id="host.settings.animations.reduce" defaultMessage="Reduce motion (manual)" /></span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={animations.autoDetectPerformance}
                onChange={(e) => dispatch(setAutoDetectPerformance(e.target.checked))}
                disabled={!animations.animationsEnabled}
              />
              <span><FormattedMessage id="host.settings.animations.autoDetect" defaultMessage="Auto-detect slow devices" /></span>
            </label>
            <p className="text-xs opacity-60">
              <FormattedMessage
                id="host.settings.animations.hint"
                defaultMessage="Score animations will adapt based on these settings"
              />
            </p>
          </div>
        )}
      </div>

      {/* Auto-Reveal Settings */}
      <div className="rounded-lg border border-[var(--fg)]/10 bg-[var(--card)] overflow-hidden">
        <button
          onClick={() => toggleSection('reveal')}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5"
          title="Toggle reveal settings"
        >
          <h3 className="text-lg font-semibold">
            <FormattedMessage id="host.settings.reveal.title" defaultMessage="Answer Reveal Settings" />
          </h3>
          <span className="text-xl">{expandedSections.reveal ? '−' : '+'}</span>
        </button>
        {expandedSections.reveal && (
          <div className="px-4 pb-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={reveal.autoRevealEnabled}
                onChange={(e) => dispatch(setAutoRevealEnabled(e.target.checked))}
              />
              <span><FormattedMessage id="host.settings.reveal.auto" defaultMessage="Auto-reveal answers" /></span>
            </label>
            <label className="block text-sm space-y-1">
              <span><FormattedMessage id="host.settings.reveal.timeout" defaultMessage="Timeout after all players answer (seconds)" /></span>
              <input
                type="number"
                min={3}
                max={60}
                value={reveal.autoRevealTimeout}
                onChange={(e) => dispatch(setAutoRevealTimeout(Number(e.target.value)))}
                className="w-40 px-3 py-2 rounded border border-[var(--fg)]/20 bg-[var(--bg)]"
                disabled={!reveal.autoRevealEnabled}
              />
            </label>
            <p className="text-xs opacity-60">
              <FormattedMessage
                id="host.settings.reveal.hint"
                defaultMessage="When enabled, answers reveal automatically. Host can always reveal manually."
              />
            </p>
          </div>
        )}
      </div>

      <p className="text-xs opacity-70 px-2">
        <FormattedMessage id="host.settings.global" defaultMessage="These are global defaults. You can override them per session." />
      </p>
    </div>
  );
}
