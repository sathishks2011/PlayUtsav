# Sound Assets for Quiz Game

This directory contains audio files used in the quiz application.

## Required Sound Files

### 1. `coin.mp3`
- **Purpose**: Plays when a player earns points for a correct answer
- **Duration**: 0.5-1 second
- **Style**: Bright, rewarding coin collection sound
- **Suggested sources**:
  - [Freesound.org - Coin sounds](https://freesound.org/search/?q=coin+collect)
  - [Zapsplat - Coin pickup](https://www.zapsplat.com/sound-effect-category/coins/)

### 2. `buzzer.mp3`
- **Purpose**: Plays when the host activates the buzzer or a wrong answer is selected
- **Duration**: 0.5-1.5 seconds
- **Style**: Game show buzzer, incorrect answer tone
- **Suggested sources**:
  - [Freesound.org - Buzzer sounds](https://freesound.org/search/?q=game+buzzer)
  - [Zapsplat - Wrong answer](https://www.zapsplat.com/sound-effect-category/buzzers/)

### 3. `background.mp3`
- **Purpose**: Background music that plays during the quiz (looped)
- **Duration**: 1-3 minutes (will loop)
- **Style**: Upbeat, energetic, game show style music
- **Suggested sources**:
  - [Free Music Archive](https://freemusicarchive.org/search?quicksearch=game+music)
  - [YouTube Audio Library](https://www.youtube.com/audiolibrary/music)
  - [Incompetech - Royalty Free Music](https://incompetech.com/music/royalty-free/music.html)

### 4. `notification.mp3`
- **Purpose**: Plays for general notifications (new player joined, round starting, etc.)
- **Duration**: 0.5-1 second
- **Style**: Pleasant notification chime
- **Suggested sources**:
  - [Freesound.org - Notification sounds](https://freesound.org/search/?q=notification)
  - [Zapsplat - UI sounds](https://www.zapsplat.com/sound-effect-category/ui-sounds/)

## Default Placeholders

Currently, the app uses default paths for these files:
- `/sounds/coin.mp3`
- `/sounds/buzzer.mp3`
- `/sounds/background.mp3`
- `/sounds/notification.mp3`

If these files are not present, sounds will be disabled automatically.

## Adding Custom Sounds

1. Download or create your audio files in MP3 format
2. Name them according to the list above
3. Place them in this directory
4. Restart the development server

## Licensing

Make sure any sound files you use are either:
- Created by you
- Licensed for your use (check Creative Commons, royalty-free libraries)
- Properly attributed if required

## File Format Requirements

- **Format**: MP3 (best compatibility)
- **Sample Rate**: 44.1 kHz recommended
- **Bit Rate**: 128-192 kbps (good quality without large file sizes)
- **Channels**: Mono or Stereo

## How to Test Sounds (Quick Setup)

### Step 1: Add Test Sounds
You need at least `coin.mp3` to test the sound system.

**Fastest Option - Download from Free Sources:**
1. Visit https://mixkit.co/free-sound-effects/coin/ 
2. Download any coin sound effect
3. Rename it to `coin.mp3`
4. Place it in this directory (`apps/web/public/sounds/`)

**Alternative - Use Any MP3:**
For quick testing, you can even use any short MP3 file renamed to `coin.mp3`

### Step 2: Test in the App
1. Start the app: `pnpm dev:web`
2. Login as host (host@demo.com / Host@123)
3. Go to **Host Console → Settings tab**
4. Expand **"Sound Settings"** section
5. Check **"Enable all sounds"**
6. Set **Master volume** to 50-100%
7. Click **"🔊 Test Sound (Coin)"** button
8. You should hear the sound!

### Troubleshooting:
- ❌ **No sound?** Check browser console (F12) for errors
- ❌ **File not found?** Ensure `coin.mp3` exists in `apps/web/public/sounds/`
- ❌ **Still not working?** Check if browser blocks audio (try clicking somewhere first)
- ✅ **Working?** Add other sounds (`buzzer.mp3`, `notification.mp3`)

## Future Admin Feature

In Phase 2, the app will include an admin panel where you can:
- Upload custom sound files
- Preview sounds before saving
- Manage multiple sound themes
- Set per-session sound configurations

