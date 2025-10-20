# Bioscope Image Display and Sound System Implementation

## Date: October 17, 2025

## Overview
Fixed two critical issues with the Bioscope game:
1. **Image Display**: Images now show actual preview thumbnails in the host control panel
2. **Sound System**: Implemented comprehensive sound effects for image reveals, answer reveals, correct/wrong answers, and timer ticks

## Changes Made

### 1. Created Sound Hook: `useBioscopeSounds.ts`
**Location**: `apps/web/src/hooks/useBioscopeSounds.ts`

**Features**:
- `playImageRevealSound()` - Plays when host reveals an image
- `playCorrectAnswerSound()` - Plays when player submits correct answer
- `playWrongAnswerSound()` - Plays when player submits wrong answer
- `playAnswerRevealSound()` - Plays when host reveals the answer
- `startTimerTick(timeRemaining)` - Plays tick sound in last 10 seconds
- `stopTimerTick()` - Stops timer tick sounds

**Sound Mapping**:
- Image reveal → `notification` sound
- Correct answer → `coin` sound
- Wrong answer → `coin_wrong` sound
- Answer reveal → `buzzer` sound
- Timer tick → `notification` sound (50% volume)

**Respects Settings**:
- Master volume control
- Sounds enabled/disabled toggle
- Individual sound type toggles
- Timer sound enabled/disabled

### 2. Updated `BioscopeImageRevealControl.tsx`
**Location**: `apps/web/src/components/BioscopeImageRevealControl.tsx`

**New Features**:
- **Next Image Preview** - Shows a large preview (132x132px) of the next image to be revealed
- **Image Display** - Shows actual image from `file` path property
- **Error Handling** - Shows "Image not found" message if image fails to load
- **Image Metadata** - Displays hint and points multiplier for next image

**Image Path Handling**:
- Images are referenced from template's `image.file` property
- Expected path format: `/images/round1-1.jpg`, `/images/round1-2.png`, etc.
- Fallback: Shows "Image not found" if image fails to load

### 3. Updated `HostBioscopePanel.tsx`
**Location**: `apps/web/src/components/HostBioscopePanel.tsx`

**Sound Integration**:
1. **Initialization**:
   - Imported `useBioscopeSounds` hook
   - Initialized sound system with timer threshold of 10 seconds
   - Respects `timer_sound_enabled` from template configuration

2. **WebSocket Event Handlers**:
   - `bioscope:image-revealed` → Triggers `playImageRevealSound()`
   - `bioscope:answer-revealed` → Triggers `playAnswerRevealSound()`

3. **Timer Integration**:
   - Modified timer tick effect to call `startTimerTick(remaining)`
   - Stops timer sounds when timer is not active
   - Cleanup on component unmount

## Image Setup Instructions

### For Template Creators:

1. **Place Images in Public Folder**:
   ```
   apps/web/public/images/
   ├── round1-1.jpg
   ├── round1-2.png
   └── round1-3.png
   ```

2. **Reference Images in Template**:
   ```json
   {
     "rounds": [
       {
         "round_id": "1",
         "title": "Monument",
         "images": [
           {
             "id": "1",
             "file": "/images/round1-1.jpg",
             "hint": "First clue"
           },
           {
             "id": "2",
             "file": "/images/round1-2.png",
             "hint": "Second clue"
           }
         ]
       }
     ]
   }
   ```

3. **Image Path Format**:
   - Always start with `/images/`
   - Use lowercase filenames
   - Supported formats: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`

### For Developers:

**Vite Static Asset Serving**:
- Files in `public/` are served from the root URL `/`
- No need for special import or build step
- Images are accessible at `http://localhost:5173/images/filename.jpg`

## Sound System Details

### Available Sounds:
Located in `apps/web/public/sounds/`:
- `coin.mp3` - Correct answer
- `coin_wrong.mp3` - Wrong answer
- `buzzer.mp3` - Answer reveal
- `notification.mp3` - Image reveal & timer ticks
- `background.mp3` - Background music (not used in Bioscope)

### Sound Configuration in Template:
```json
{
  "configuration": {
    "timer_sound_enabled": true,
    "sound_effects": {
      "on_image_reveal": "notification.mp3",
      "on_correct_answer": "coin.mp3",
      "on_wrong_answer": "coin_wrong.mp3"
    }
  }
}
```

### Sound Behavior:
- **Image Reveal**: Plays immediately when host clicks "Reveal Next Image"
- **Answer Reveal**: Plays when host clicks "Reveal Answer"
- **Timer Tick**: Plays every second when ≤10 seconds remain (at 50% volume)
- **Correct/Wrong**: Would be triggered by player answer submissions (to be implemented in player UI)

## Testing Checklist

### Image Display:
- [ ] Create bioscope template with images in `/images/` folder
- [ ] Upload template via BioscopeTemplateManager
- [ ] Create session with bioscope template
- [ ] Open HostLobby - should show HostBioscopePanel
- [ ] Verify "Next Image to Reveal" shows correct preview
- [ ] Click "Reveal Next Image" - verify image appears
- [ ] Test with missing image - should show "Image not found"

### Sound System:
- [ ] Ensure master volume is > 0 in settings
- [ ] Ensure "Sounds Enabled" toggle is ON
- [ ] Ensure "Notification Sounds" toggle is ON
- [ ] Start bioscope game
- [ ] Reveal first image - should hear notification sound
- [ ] Wait for timer to reach 10s - should hear tick sounds
- [ ] Reveal answer - should hear buzzer sound
- [ ] Test with sounds disabled - should be silent
- [ ] Test volume slider - sounds should respect volume level

## Known Limitations

1. **Image Size**: Preview is fixed at 132x132px - very large images will be scaled down
2. **Image Formats**: No validation of image format - relies on browser support
3. **Player Sounds**: Correct/wrong answer sounds are available but need player UI integration
4. **Mobile Audio**: Sounds require user interaction to unlock on mobile (handled by soundManager)

## Future Enhancements

1. **Image Validation**: Add image format and size validation on upload
2. **Image Optimization**: Compress/resize images automatically on upload
3. **Custom Sounds**: Allow templates to specify custom sound files
4. **Sound Preview**: Add sound test buttons in template editor
5. **Visual Effects**: Add animations when images are revealed
6. **Player Integration**: Trigger correct/wrong sounds when players submit answers

## Related Files

### Modified:
- `apps/web/src/components/BioscopeImageRevealControl.tsx`
- `apps/web/src/components/HostBioscopePanel.tsx`
- `apps/web/src/screens/HostLobby.tsx`
- `services/api/prisma/schema.prisma`
- `services/api/src/services/sessions.service.ts`
- `packages/core/src/types.ts`

### Created:
- `apps/web/src/hooks/useBioscopeSounds.ts`

### Dependencies:
- `apps/web/src/lib/soundManager.ts` (existing)
- `apps/web/src/store/slices/settingsSlice.ts` (existing)
- `apps/web/public/sounds/*.mp3` (existing)
- `apps/web/public/images/` (user-provided)

## Troubleshooting

### Images Not Showing:
1. Check image path starts with `/images/`
2. Verify image file exists in `apps/web/public/images/`
3. Check browser console for 404 errors
4. Ensure Vite dev server is running on port 5173
5. Try accessing image directly: `http://localhost:5173/images/yourimage.jpg`

### Sounds Not Playing:
1. Check browser console for audio unlock errors
2. Verify master volume > 0 in settings
3. Ensure "Sounds Enabled" toggle is ON
4. Check individual sound toggles (notifications, etc.)
5. On mobile: tap screen to unlock audio context
6. Verify sound files exist in `apps/web/public/sounds/`

### Timer Tick Not Stopping:
1. Check if timer is properly cleared on component unmount
2. Verify `stopTimerTick()` is called in cleanup
3. Check for multiple instances of HostBioscopePanel

## API Changes

### Schema Updates:
- Added `bioscopeSession` relation to `Session` model
- Added `session` relation to `BioscopeSession` model
- Updated `getSnapshot()` to include `bioscopeSession`

### Frontend Types:
- Added `bioscopeSession` field to `Session` type in `packages/core/src/types.ts`

These changes enable proper detection of which game type is active in HostLobby.
