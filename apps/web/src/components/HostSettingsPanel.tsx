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
  setCoinWrongSoundEnabled,
  setBuzzerSoundEnabled,
  setBackgroundMusicEnabled,
  setNotificationSoundsEnabled,
  setAnimationsEnabled,
  setReduceMotion,
  setAutoDetectPerformance,
  setAutoRevealEnabled,
  setAutoRevealTimeout,
} from '../store/slices/settingsSlice';

import { useToast } from './ToastProvider';
export function HostSettingsPanel() {
  const dispatch = useDispatch();
  const toast = useToast();
  
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
                type="text"
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
            {/* Audio Unlock Button */}
            <div className="p-3 rounded bg-blue-500/10 border border-blue-400/30">
              <div className="flex items-start gap-3">
                <div className="flex-1 text-xs text-blue-200">
                  <div className="font-medium mb-1">🔊 Audio System</div>
                  <div className="opacity-80">Browsers require user interaction before playing audio. Click the button below to unlock audio playback.</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      console.log('[Audio Unlock] Manual unlock triggered');
                      const { soundManager } = await import('../lib/soundManager');
                      
                      // Force initialization and audio unlock
                      soundManager.initialize({
                        ...sounds,
                        notificationsEnabled: sounds.notificationSoundsEnabled,
                      });
                      
                      // Try to play a silent sound to unlock
                      const audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4QfQ+5EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQZDgP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==');
                      await audio.play();
                      audio.pause();
                      
                      console.log('[Audio Unlock] Audio unlocked successfully');
                      toast.showToast({ message: '✅ Audio system unlocked! You can now test sounds.', type: 'success', duration: 3500 });
                    } catch (error) {
                      console.error('[Audio Unlock] Failed:', error);
                      toast.showToast({ message: '⚠️ Audio unlock failed. Try clicking anywhere on the page first.', type: 'error', duration: 5000 });
                    }
                  }}
                  className="px-3 py-1.5 rounded bg-blue-500/30 border border-blue-400/50 text-blue-100 hover:bg-blue-500/40 text-xs font-medium whitespace-nowrap"
                >
                  🔓 Unlock Audio
                </button>
              </div>
            </div>

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
            </div>

            {/* Coin/Correct Answer Sound */}
            <div className="space-y-2 p-3 rounded bg-white/5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={sounds.coinSoundEnabled}
                    onChange={(e) => dispatch(setCoinSoundEnabled(e.target.checked))}
                    disabled={!sounds.soundsEnabled}
                  />
                  <span>🪙 <FormattedMessage id="host.settings.sounds.coin" defaultMessage="Correct Answer Sound" /></span>
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      console.log('[Test Button] Coin sound test started');
                      const { soundManager } = await import('../lib/soundManager');
                      
                      // Force re-initialize if needed
                      soundManager.updateSettings({
                        ...sounds,
                        notificationsEnabled: sounds.notificationSoundsEnabled,
                      });
                      
                      console.log('[Test Button] Calling playSound...');
                      soundManager.playSound('coin', sounds.masterVolume / 100);
                      console.log('[Test Button] playSound called successfully');
                    } catch (error) {
                      console.error('[Test Button] Failed to play coin sound:', error);
                      toast.showToast({ message: `Failed to play sound: ${error instanceof Error ? error.message : String(error)}. Check console for details.`, type: 'error', duration: 7000 });
                    }
                  }}
                  disabled={!sounds.soundsEnabled || !sounds.coinSoundEnabled}
                  className="px-3 py-1 rounded bg-green-500/20 border border-green-400/40 text-green-200 hover:bg-green-500/30 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                >
                  ▶ Test
                </button>
              </div>
              <input
                type="text"
                value={sounds.coinSoundPath}
                readOnly
                aria-label="Coin sound file path"
                className="w-full px-2 py-1 rounded border border-[var(--fg)]/20 bg-[var(--bg)] text-xs opacity-70"
                placeholder="/sounds/coin.mp3"
              />
            </div>

            {/* Wrong Answer Sound */}
            <div className="space-y-2 p-3 rounded bg-white/5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={sounds.coinWrongSoundEnabled}
                    onChange={(e) => dispatch(setCoinWrongSoundEnabled(e.target.checked))}
                    disabled={!sounds.soundsEnabled}
                  />
                  <span>❌ <FormattedMessage id="host.settings.sounds.coinWrong" defaultMessage="Wrong Answer Sound" /></span>
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      console.log('[Test Button] Wrong answer sound test started');
                      const { soundManager } = await import('../lib/soundManager');
                      soundManager.updateSettings({
                        ...sounds,
                        notificationsEnabled: sounds.notificationSoundsEnabled,
                      });
                      soundManager.playSound('coin_wrong', sounds.masterVolume / 100);
                    } catch (error) {
                      console.error('[Test Button] Failed to play wrong answer sound:', error);
                      toast.showToast({ message: `Failed to play sound: ${error instanceof Error ? error.message : String(error)}`, type: 'error', duration: 6000 });
                    }
                  }}
                  disabled={!sounds.soundsEnabled || !sounds.coinWrongSoundEnabled}
                  className="px-3 py-1 rounded bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                >
                  ▶ Test
                </button>
              </div>
              <input
                type="text"
                value={sounds.coinWrongSoundPath}
                readOnly
                aria-label="Wrong answer sound file path"
                className="w-full px-2 py-1 rounded border border-[var(--fg)]/20 bg-[var(--bg)] text-xs opacity-70"
                placeholder="/sounds/coin_wrong.mp3"
              />
            </div>

            {/* Buzzer Sound */}
            <div className="space-y-2 p-3 rounded bg-white/5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={sounds.buzzerSoundEnabled}
                    onChange={(e) => dispatch(setBuzzerSoundEnabled(e.target.checked))}
                    disabled={!sounds.soundsEnabled}
                  />
                  <span>🔔 <FormattedMessage id="host.settings.sounds.buzzer" defaultMessage="Buzzer Sound" /></span>
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      console.log('[Test Button] Buzzer sound test started');
                      const { soundManager } = await import('../lib/soundManager');
                      soundManager.updateSettings({
                        ...sounds,
                        notificationsEnabled: sounds.notificationSoundsEnabled,
                      });
                      soundManager.playSound('buzzer', sounds.masterVolume / 100);
                    } catch (error) {
                      console.error('[Test Button] Failed to play buzzer sound:', error);
                      toast.showToast({ message: `Failed to play sound: ${error instanceof Error ? error.message : String(error)}`, type: 'error', duration: 6000 });
                        toast.showToast({ message: 'Enable background music first to test', type: 'info', duration: 3500 });
                    }
                  }}
                  disabled={!sounds.soundsEnabled || !sounds.buzzerSoundEnabled}
                  className="px-3 py-1 rounded bg-blue-500/20 border border-blue-400/40 text-blue-200 hover:bg-blue-500/30 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                >
                  ▶ Test
                </button>
              </div>
              <input
                type="text"
                value={sounds.buzzerSoundPath}
                readOnly
                aria-label="Buzzer sound file path"
                className="w-full px-2 py-1 rounded border border-[var(--fg)]/20 bg-[var(--bg)] text-xs opacity-70"
                placeholder="/sounds/buzzer.mp3"
              />
            </div>

            {/* Notification Sound */}
            <div className="space-y-2 p-3 rounded bg-white/5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={sounds.notificationSoundsEnabled}
                    onChange={(e) => dispatch(setNotificationSoundsEnabled(e.target.checked))}
                    disabled={!sounds.soundsEnabled}
                  />
                  <span>🔔 <FormattedMessage id="host.settings.sounds.notification" defaultMessage="Notification Sound" /></span>
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      console.log('[Test Button] Notification sound test started');
                      const { soundManager } = await import('../lib/soundManager');
                      soundManager.updateSettings({
                        ...sounds,
                        notificationsEnabled: sounds.notificationSoundsEnabled,
                      });
                      soundManager.playSound('notification', sounds.masterVolume / 100);
                    } catch (error) {
                      console.error('[Test Button] Failed to play notification sound:', error);
                        toast.showToast({ message: `Failed to play sound: ${error instanceof Error ? error.message : String(error)}`, type: 'error', duration: 6000 });
                    }
                  }}
                  disabled={!sounds.soundsEnabled || !sounds.notificationSoundsEnabled}
                  className="px-3 py-1 rounded bg-purple-500/20 border border-purple-400/40 text-purple-200 hover:bg-purple-500/30 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                >
                  ▶ Test
                </button>
              </div>
              <input
                type="text"
                value={sounds.notificationSoundPath}
                readOnly
                aria-label="Notification sound file path"
                className="w-full px-2 py-1 rounded border border-[var(--fg)]/20 bg-[var(--bg)] text-xs opacity-70"
                placeholder="/sounds/notification.mp3"
              />
              <p className="text-xs opacity-60">
                <FormattedMessage id="host.settings.sounds.notificationDesc" defaultMessage="Plays when players join or get assigned to teams" />
              </p>
            </div>

            {/* Background Music */}
            <div className="space-y-2 p-3 rounded bg-white/5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={sounds.backgroundMusicEnabled}
                    onChange={(e) => dispatch(setBackgroundMusicEnabled(e.target.checked))}
                    disabled={!sounds.soundsEnabled}
                  />
                  <span>🎵 <FormattedMessage id="host.settings.sounds.background" defaultMessage="Background Music" /></span>
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      console.log('[Test Button] Background music test started');
                      const { soundManager } = await import('../lib/soundManager');
                      soundManager.updateSettings({
                        ...sounds,
                        notificationsEnabled: sounds.notificationSoundsEnabled,
                      });
                      if (sounds.backgroundMusicEnabled) {
                        soundManager.stopBackgroundMusic();
                        setTimeout(() => soundManager.startBackgroundMusic(), 100);
                      } else {
                        toast.showToast({ message: 'Enable background music first to test', type: 'info', duration: 3500 });
                      }
                      } catch (error) {
                      console.error('[Test Button] Failed to play background music:', error);
                      toast.showToast({ message: `Failed to play music: ${error instanceof Error ? error.message : String(error)}`, type: 'error', duration: 6000 });
                    }
                  }}
                  disabled={!sounds.soundsEnabled}
                  className="px-3 py-1 rounded bg-amber-500/20 border border-amber-400/40 text-amber-200 hover:bg-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                >
                  ▶ Test
                </button>
              </div>
              <input
                type="text"
                value={sounds.backgroundMusicPath}
                readOnly
                aria-label="Background music file path"
                className="w-full px-2 py-1 rounded border border-[var(--fg)]/20 bg-[var(--bg)] text-xs opacity-70"
                placeholder="/sounds/background.mp3"
              />
              <p className="text-xs opacity-60">
                <FormattedMessage id="host.settings.sounds.backgroundDesc" defaultMessage="Loops continuously during gameplay" />
              </p>
            </div>

            {/* Test All Sounds */}
            <div className="pt-3 border-t border-[var(--fg)]/10">
              <button
                type="button"
                onClick={async () => {
                  try {
                    console.log('[Test All] Starting test sequence...');
                    const { soundManager } = await import('../lib/soundManager');
                    
                    // Update settings first
                    soundManager.updateSettings({
                      ...sounds,
                      notificationsEnabled: sounds.notificationSoundsEnabled,
                    });
                    
                    const volume = sounds.masterVolume / 100;
                    let count = 0;
                    
                    // Play all sounds with delay
                    if (sounds.coinSoundEnabled) {
                      console.log('[Test All] Playing coin sound...');
                      soundManager.playSound('coin', volume);
                      count++;
                    }
                    setTimeout(() => {
                      if (sounds.coinWrongSoundEnabled) {
                        console.log('[Test All] Playing wrong answer sound...');
                        soundManager.playSound('coin_wrong', volume);
                      }
                    }, 1000);
                    setTimeout(() => {
                      if (sounds.buzzerSoundEnabled) {
                        console.log('[Test All] Playing buzzer sound...');
                        soundManager.playSound('buzzer', volume);
                      }
                    }, 2000);
                    setTimeout(() => {
                      if (sounds.notificationSoundsEnabled) {
                        console.log('[Test All] Playing notification sound...');
                        soundManager.playSound('notification', volume);
                      }
                    }, 3000);
                    
                    console.log(`[Test All] Testing ${count > 0 ? 'all' : 'no'} enabled sounds with 1 second interval`);
                  } catch (error) {
                    console.error('[Test All] Failed to test sounds:', error);
                    toast.showToast({ message: `Failed to play sounds: ${error instanceof Error ? error.message : String(error)}`, type: 'error', duration: 6000 });
                  }
                }}
                disabled={!sounds.soundsEnabled}
                className="w-full px-4 py-2 rounded bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-400/40 text-white hover:from-green-500/30 hover:to-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                🎵 <FormattedMessage id="host.settings.sounds.testAll" defaultMessage="Test All Sounds (Sequential)" />
              </button>
            </div>

            {/* Debug Info */}
            <div className="p-3 rounded bg-black/20 text-xs font-mono space-y-1">
              <div className="text-[var(--fg)]/60">Sound System Status:</div>
              <div>Master Enabled: {sounds.soundsEnabled ? '✅' : '❌'}</div>
              <div>Master Volume: {sounds.masterVolume}%</div>
              <div>Files Location: /public/sounds/</div>
              <div className="pt-2 text-[var(--fg)]/40">Open browser console (F12) for detailed logs</div>
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
