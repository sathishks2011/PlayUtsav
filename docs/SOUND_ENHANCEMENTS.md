# Sound Enhancements Implementation

## Overview
This document outlines the implementation of three sound enhancement features for the PlayUtsav quiz application.

## Implemented Features

### 1. **Buzzer Sound on Button Press** ✅
- **Location**: `apps/web/src/components/PlayerBuzzerButton.tsx`
- **Behavior**: When a player clicks the buzzer button, the `buzzer.mp3` sound plays immediately
- **Implementation**:
  ```typescript
  const handlePress = () => {
    if (!session || !participantId || disabled) return;
    
    // Play buzzer sound
    soundManager.playSound('buzzer');
    
    dispatch(pressBuzzerThunk({ sessionId: session.id, participantId }));
  };
  ```

### 2. **Wrong Answer Sound** ✅
- **Location**: `apps/web/src/components/PlayerQuizPanel.tsx`
- **Behavior**: When the quiz is revealed and the player's answer is incorrect, the `coin_wrong.mp3` sound plays
- **Implementation**:
  ```typescript
  // Play wrong answer sound when quiz is revealed and player got it wrong
  useEffect(() => {
    if (!quiz || quiz.status !== 'revealed' || !submitted || selected == null) return;
    
    const isCorrect = quiz.correctOption === selected;
    if (!isCorrect) {
      // Play wrong answer sound
      soundManager.playSound('coin_wrong');
    }
  }, [quiz?.status, quiz?.correctOption, selected, submitted]);
  ```

### 3. **Host Sound Controls** ✅
- **Location**: `apps/web/src/components/HostSettingsPanel.tsx`
- **New Controls Added**:
  - ✅ **Wrong Answer Sound Toggle**: Enable/disable wrong answer sound
  - ✅ **Buzzer Sound Toggle**: Enable/disable buzzer press sound
  - ✅ **Master Sound Toggle**: Already existed, enables/disables all sounds

## Technical Changes

### Sound Manager Updates (`apps/web/src/lib/soundManager.ts`)
1. **Added new sound type**: `coin_wrong` to `SoundType`
   ```typescript
   export type SoundType = 'coin' | 'coin_wrong' | 'buzzer' | 'background' | 'notification';
   ```

2. **Updated SoundSettings interface**:
   ```typescript
   interface SoundSettings {
     // ... existing settings
     coinWrongSoundEnabled: boolean;
     coinWrongSoundPath: string;
   }
   ```

3. **Updated methods**:
   - `loadSounds()`: Now loads `coin_wrong.mp3`
   - `updateSettings()`: Handles `coin_wrong` path and enabled state
   - `getSoundEnabledState()`: Returns enabled state for `coin_wrong`

### Settings Slice Updates (`apps/web/src/store/slices/settingsSlice.ts`)
1. **Added new settings**:
   ```typescript
   coinWrongSoundEnabled: true,
   coinWrongSoundPath: '/sounds/coin_wrong.mp3',
   ```

2. **Added new actions**:
   - `setCoinWrongSoundEnabled(state, action)`
   - `setCoinWrongSoundPath(state, action)`

3. **Exported new action creators**:
   ```typescript
   export const {
     // ... existing exports
     setCoinWrongSoundEnabled,
     setCoinWrongSoundPath,
   }
   ```

### Host Settings Panel Updates (`apps/web/src/components/HostSettingsPanel.tsx`)
Added three sound toggles in the "Quiz Sounds" section:
1. **Coin/correct answer sound** (already existed)
2. **Wrong answer sound** (NEW)
3. **Buzzer sound (when pressed)** (NEW - clarified label)

## Sound Files
All sound files are located in `apps/web/public/sounds/`:
- ✅ `buzzer.mp3` - Plays when buzzer is pressed
- ✅ `coin.mp3` - Plays for correct answers
- ✅ `coin_wrong.mp3` - Plays for wrong answers

## Usage Flow

### Player Experience
1. **Joining Session**:
   - Player joins session in buzzer mode
   - Waits for host to start quiz

2. **Buzzer Press**:
   - Player clicks buzzer → **Buzzer sound plays** 🔊
   - Waits for host to allow answering

3. **Answer Submission**:
   - Player selects answer and submits
   - Waits for host to reveal

4. **Answer Reveal**:
   - Host reveals correct answer
   - If player got it **wrong** → **Wrong answer sound plays** 🔊
   - If player got it **right** → **Coin sound plays** 🔊 (from existing score animation)

### Host Experience
1. **Configure Sounds**:
   - Go to Settings panel
   - Toggle "Enable all sounds" master switch
   - Fine-tune individual sound toggles:
     - ✅ Coin/correct answer sound
     - ✅ Wrong answer sound
     - ✅ Buzzer sound (when pressed)
     - ✅ Background music
     - ✅ Notification sounds
   - Adjust master volume slider (0-100%)

2. **Sound Respects Settings**:
   - If master toggle is OFF → No sounds play
   - If specific sound is OFF → Only that sound is disabled
   - Volume affects all sounds proportionally

## Testing Checklist

### Buzzer Sound
- [ ] Click buzzer button → Sound plays immediately
- [ ] Sound respects master volume
- [ ] Sound respects "Buzzer sound" toggle
- [ ] Sound respects master "Enable all sounds" toggle
- [ ] No sound plays if button is disabled

### Wrong Answer Sound
- [ ] Select wrong answer and submit
- [ ] Wait for host to reveal
- [ ] Wrong answer sound plays when revealed
- [ ] Sound respects master volume
- [ ] Sound respects "Wrong answer sound" toggle
- [ ] Sound respects master "Enable all sounds" toggle
- [ ] No sound plays if answer was correct

### Host Controls
- [ ] Toggle "Enable all sounds" → All sounds turn on/off
- [ ] Toggle "Wrong answer sound" → Only wrong answer sound affected
- [ ] Toggle "Buzzer sound" → Only buzzer sound affected
- [ ] Adjust master volume → All sounds get louder/quieter
- [ ] Settings persist across page refresh
- [ ] Test sound button plays coin sound at current volume

## Future Enhancements
Potential improvements for future sprints:
1. **Timer Warning Sound**: Play sound when timer is about to expire (< 5 seconds)
2. **Custom Sound Upload**: Allow hosts to upload custom sound files
3. **Sound Preview**: Test button for each sound type in settings
4. **Volume Per Sound**: Individual volume control for each sound type
5. **Sound Effects Library**: Multiple sound options to choose from

## Dependencies
- SoundManager singleton (`apps/web/src/lib/soundManager.ts`)
- Redux settings slice (`apps/web/src/store/slices/settingsSlice.ts`)
- React hooks (useEffect, useSelector, useDispatch)
- Sound files in `public/sounds/` directory

## Notes
- All sounds are preloaded on app initialization for smooth playback
- Low-performance devices automatically disable sounds to maintain performance
- Sounds use HTML5 Audio API with fallback error handling
- Volume is normalized between 0.0 and 1.0 internally (0-100% in UI)
