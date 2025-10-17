# Sprint 4 Plan - Bioscope Game Feature

**Branch:** `feature/sprint4-bioscope`  
**Start Date:** October 16, 2025  
**Status:** Planning  
**Priority:** High

## 🎯 Sprint Goal

Implement a new interactive game called **Bioscope** - an image-based guessing game where players guess a title (movie, TV show, etc.) based on images revealed one at a time by the host. The game will be displayed beneath the existing quiz game and support both text input and voice-based manual scoring.

## 🎬 Game Concept: Bioscope

**Bioscope** is an image reveal quiz game where:
- Host reveals images one at a time
- Players guess the title based on the revealed images
- Earlier correct guesses earn more points
- Final image reveal shows the answer with animation and sound
- Supports both automated text input scoring and manual host scoring

## 📋 Requirements Summary

### Game Flow
1. **Image Reveal Phase**
   - Host clicks "Reveal Next Image" button
   - Image appears with fade-in animation
   - Small image reveal sound plays
   - Timer starts (default 30 seconds, configurable)
   - Timer sound plays during countdown

2. **Player Submission**
   - **Primary**: Players type answer in text input field (case-insensitive)
   - **Alternative**: Host gives points manually for voice answers (in-person mode)
   - Players can submit only ONE final answer per round
   - Wrong answer = locked out (no retry)

3. **Answer Reveal**
   - **Auto-reveal**: After timer expires (if all images revealed)
   - **Manual reveal**: Host can reveal anytime
   - Title appears above images with bounce-in animation
   - Final reveal sound plays
   - Correct guessers see celebration animation

### Scoring System
```
Points Calculation:
- Image 1 guess: 100 points + 20 early bonus = 120 points
- Image 2 guess: 100 points + 10 early bonus = 110 points
- Image 3 guess: 100 points (base)
- Last image: 50 points (common score for final attempt)
```

**Scoring Logic:**
- Earlier image = More points
- Each subsequent image = Less bonus
- Final image = Common baseline score
- Time-based scoring within each image phase

### Player Input Modes

#### Mode A: Text Input (Automated)
- Text field for typing answer
- Case-insensitive matching
- Submit button
- Instant feedback on correct/wrong
- Auto-scoring

#### Mode B: Multiple Choice (Optional)
- Host can enable MCQ mode in template
- 3-4 options provided
- Radio button selection
- Auto-scoring like quiz

#### Mode C: Manual Scoring (In-Person)
- Host control panel has manual scoring buttons
- Host can award points to specific teams
- Used when players answer verbally
- Host confirms correct answers manually

### Template Configuration

**JSON Structure:**
```json
{
  "game": {
    "id": "bioscope_001",
    "name": "Bioscope",
    "version": "1.0",
    "type": "image_reveal_quiz"
  },
  "configuration": {
    "timer_seconds": 30,
    "timer_sound_enabled": true,
    "multiple_choice_mode": false,
    "allow_manual_scoring": true,
    "max_images": 5
  },
  "rounds": [
    {
      "round_id": 1,
      "title": "Movie Title Guess",
      "images": [
        {
          "id": 1,
          "file": "images/round1/img1.jpg",
          "hint": "Opening sequence",
          "points_multiplier": 1.2
        },
        {
          "id": 2,
          "file": "images/round1/img2.jpg",
          "hint": "Main character",
          "points_multiplier": 1.1
        },
        {
          "id": 3,
          "file": "images/round1/img3.jpg",
          "hint": "Iconic moment",
          "points_multiplier": 1.0
        }
      ],
      "answer": {
        "title": "Jurassic Park",
        "alternatives": ["Jurassic Park 1", "JP"],
        "reveal_sound": "sounds/answer_reveal.mp3"
      },
      "scoring": {
        "base_points": 100,
        "early_bonus": 20,
        "final_image_points": 50
      }
    }
  ]
}
```

### Visual Layout

#### Host Panel Layout
```
┌─────────────────────────────────────────────┐
│         Host Lobby (Existing)               │
├─────────────────────────────────────────────┤
│         Quiz Section (Existing)             │
│  [Start Quiz] [Reveal] [Next Question]      │
├─────────────────────────────────────────────┤
│  🎬 BIOSCOPE GAME                           │
│  ┌───────────────────────────────────────┐ │
│  │ Round 1: Movie Title Guess            │ │
│  │                                       │ │
│  │ Images Revealed: 2/5                  │ │
│  │ [Reveal Next Image] [Reveal Answer]   │ │
│  │                                       │ │
│  │ Manual Scoring:                       │ │
│  │ Team A [+10] [+20] [+50]             │ │
│  │ Team B [+10] [+20] [+50]             │ │
│  │                                       │ │
│  │ Preview: 🖼️ 🖼️ ⬜ ⬜ ⬜            │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### Player Panel Layout
```
┌─────────────────────────────────────────────┐
│         Player Lobby (Existing)             │
├─────────────────────────────────────────────┤
│         Quiz Panel (When Active)            │
├─────────────────────────────────────────────┤
│  🎬 BIOSCOPE GAME                           │
│  ┌───────────────────────────────────────┐ │
│  │                                       │ │
│  │   [Your Answer Here_____]             │ │
│  │   [Submit Answer]                     │ │
│  │                                       │ │
│  │   Timer: 25s ⏱️                       │ │
│  │                                       │ │
│  │   Images Revealed:                    │ │
│  │   🖼️ 🖼️ ⬜ ⬜ ⬜                    │ │
│  │                                       │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### Answer Reveal Animation
```
┌─────────────────────────────────────────────┐
│                                             │
│        ✨ JURASSIC PARK ✨                  │
│         (bounce-in animation)               │
│                                             │
│   🖼️ 🖼️ 🖼️ 🖼️ 🖼️                      │
│   [All images now visible]                  │
│                                             │
│   🎉 Correct Guessers:                      │
│   Player1 (+120 pts) Player3 (+110 pts)     │
│                                             │
└─────────────────────────────────────────────┘
```

## 🏗️ Technical Architecture

### Database Schema

```prisma
model BioscopeTemplate {
  id              String   @id @default(cuid())
  name            String
  description     String?
  configuration   Json     // Template config (timer, sounds, etc.)
  rounds          Json     // Array of rounds with images
  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  sessions        BioscopeSession[]
}

model BioscopeSession {
  id              String   @id @default(cuid())
  sessionId       String   // Link to main Session
  templateId      String
  template        BioscopeTemplate @relation(fields: [templateId], references: [id])
  currentRoundId  Int      @default(0)
  currentImageId  Int      @default(0)
  status          String   // 'idle', 'revealing', 'answering', 'revealed'
  revealedImages  Json     @default("[]") // Array of revealed image IDs
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  answers         BioscopeAnswer[]
  
  @@unique([sessionId])
}

model BioscopeAnswer {
  id              String   @id @default(cuid())
  bioscopeId      String
  bioscope        BioscopeSession @relation(fields: [bioscopeId], references: [id])
  participantId   String
  roundId         Int
  answer          String
  submittedAt     DateTime @default(now())
  imageRevealedAt Int      // Which image was showing when submitted (1-5)
  isCorrect       Boolean  @default(false)
  pointsAwarded   Int      @default(0)
  
  @@unique([bioscopeId, participantId, roundId])
}
```

### Component Structure

```
apps/web/src/
  components/
    bioscope/
      HostBioscopePanel.tsx       # Host control panel
      PlayerBioscopePanel.tsx     # Player game interface
      BioscopeImageFrame.tsx      # Individual image frame
      BioscopeAnswerReveal.tsx    # Answer reveal animation
      BioscopeManualScoring.tsx   # Manual scoring controls
      BioscopeTimer.tsx           # Countdown timer
      
  hooks/
    useBioscopeGame.ts            # Game state management
    useBioscopeTimer.ts           # Timer logic
    
  store/slices/
    bioscopeSlice.ts              # Redux state for bioscope
    
services/api/src/
  bioscope/
    bioscope.controller.ts        # API endpoints
    bioscope.service.ts           # Business logic
    bioscope.gateway.ts           # WebSocket events
```

### WebSocket Events

```typescript
// Server -> Client
'bioscope:started'       // Game started
'bioscope:image-revealed' // New image revealed
'bioscope:answer-revealed' // Answer revealed
'bioscope:round-complete' // Round ended
'bioscope:score-updated'  // Score changed

// Client -> Server
'bioscope:reveal-image'   // Host reveals next image
'bioscope:reveal-answer'  // Host reveals final answer
'bioscope:submit-answer'  // Player submits answer
'bioscope:manual-score'   // Host gives manual points
```

### API Endpoints

```typescript
// Template Management
GET    /api/bioscope/templates              // List all templates
GET    /api/bioscope/templates/:id          // Get template by ID
POST   /api/bioscope/templates              // Create template
PUT    /api/bioscope/templates/:id          // Update template
DELETE /api/bioscope/templates/:id          // Delete template
POST   /api/bioscope/templates/:id/attach   // Attach to session

// Game Management
POST   /api/sessions/:id/bioscope/start     // Start bioscope game
POST   /api/sessions/:id/bioscope/reveal-image  // Reveal next image
POST   /api/sessions/:id/bioscope/reveal-answer // Reveal answer
POST   /api/sessions/:id/bioscope/submit    // Submit answer
POST   /api/sessions/:id/bioscope/manual-score // Manual scoring
GET    /api/sessions/:id/bioscope/state     // Get current state
```

## 📦 Deliverables

### Phase 1: Backend Foundation (Days 1-3)
- [ ] Database schema for Bioscope models
- [ ] Prisma migrations
- [ ] API endpoints for template CRUD
- [ ] API endpoints for game management
- [ ] WebSocket events for real-time updates
- [ ] Business logic for scoring calculation
- [ ] Answer validation (case-insensitive matching)

### Phase 2: Host UI (Days 4-6)
- [ ] HostBioscopePanel component
- [ ] Template selector/loader
- [ ] Image reveal controls
- [ ] Manual scoring interface
- [ ] Answer reveal button
- [ ] Round progression controls
- [ ] Preview of current game state

### Phase 3: Player UI (Days 7-9)
- [ ] PlayerBioscopePanel component
- [ ] Text input for answers
- [ ] Submit button with validation
- [ ] Image frame display (horizontal layout)
- [ ] Timer countdown display
- [ ] Answer feedback UI
- [ ] Celebration animation for correct answers

### Phase 4: Animations & Sounds (Days 10-11)
- [ ] Image reveal animation (fade-in)
- [ ] Answer reveal animation (bounce-in from top)
- [ ] Image reveal sound effect
- [ ] Answer reveal sound effect
- [ ] Timer countdown sound
- [ ] Correct answer celebration sound
- [ ] Score animation on correct guess

### Phase 5: Template System (Days 12-13)
- [ ] JSON template validator
- [ ] Template upload UI
- [ ] Template preview
- [ ] Sample templates (movies, TV shows)
- [ ] Image upload/storage handling
- [ ] Template management interface

### Phase 6: Testing & Polish (Days 14-15)
- [ ] Unit tests for scoring logic
- [ ] Integration tests for game flow
- [ ] E2E tests for complete rounds
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] Documentation

## 🎨 User Stories

1. **As a host**, I want to load a Bioscope template so that I can start a new game type
2. **As a host**, I want to reveal images one at a time so that I control the difficulty
3. **As a host**, I want to give manual points to players who answer verbally so that in-person games work smoothly
4. **As a host**, I want to see how many images are revealed so that I know the game progress
5. **As a player**, I want to type my answer and submit it so that I can participate in the game
6. **As a player**, I want to see how many images are revealed so that I know when to guess
7. **As a player**, I want to hear sounds when images are revealed so that the game is more engaging
8. **As a player**, I want to see the answer with animation so that the reveal is exciting
9. **As a player**, I want to earn more points for guessing early so that I'm rewarded for quick thinking

## 🔍 Success Criteria

### Functional Requirements
- ✅ Host can load and start a Bioscope game from template
- ✅ Host can reveal images one at a time with animation
- ✅ Host can reveal the final answer manually or let it auto-reveal
- ✅ Host can give manual points to teams for voice answers
- ✅ Players can submit text answers (case-insensitive)
- ✅ Players see image frames at the bottom (revealed in order)
- ✅ Timer counts down with sound effect
- ✅ Scoring awards more points for earlier correct guesses
- ✅ Answer reveals with animation and sound
- ✅ Game appears beneath quiz game in UI

### Non-Functional Requirements
- ✅ Image reveal animation is smooth (60fps)
- ✅ Sounds play without delay (<100ms)
- ✅ Answer matching is instant (<50ms)
- ✅ Works on mobile, web, and TV apps
- ✅ Template JSON validates correctly
- ✅ Game state persists on page refresh

## 🚧 Technical Challenges

### 1. Image Storage & Loading
**Challenge**: Storing and serving images efficiently  
**Solution**: 
- Use cloud storage (S3/Azure Blob) for images
- Or local storage with URL references
- Preload images for smooth reveals
- Lazy load non-revealed images

### 2. Real-Time Synchronization
**Challenge**: Keeping all clients in sync during image reveals  
**Solution**:
- WebSocket events for instant updates
- State reconciliation on reconnect
- Optimistic UI updates

### 3. Animation Performance
**Challenge**: Smooth animations on low-end devices  
**Solution**:
- CSS transforms (GPU accelerated)
- Reduced motion for accessibility
- Fallback to simple fades on slow devices

### 4. Answer Matching
**Challenge**: Fuzzy matching for similar answers  
**Solution**:
- Case-insensitive comparison
- Trim whitespace
- Support alternative answers in template
- Optional: Levenshtein distance for typos

### 5. Manual Scoring UX
**Challenge**: Making manual scoring quick and easy  
**Solution**:
- Quick-add buttons (+10, +20, +50)
- Team selector dropdown
- Keyboard shortcuts
- Undo last action

## 📅 Timeline

### Week 1: Backend & Foundation
- **Day 1**: Database schema, migrations, API structure
- **Day 2**: Game logic, scoring calculation, WebSocket events
- **Day 3**: Template CRUD, answer validation, testing

### Week 2: Host Interface
- **Day 4**: HostBioscopePanel component structure
- **Day 5**: Image reveal controls, manual scoring UI
- **Day 6**: Integration with session management, testing

### Week 3: Player Interface
- **Day 7**: PlayerBioscopePanel component structure
- **Day 8**: Text input, submit logic, image frames display
- **Day 9**: Timer, feedback UI, testing

### Week 4: Polish & Launch
- **Day 10-11**: Animations, sounds, visual effects
- **Day 12-13**: Template system, upload UI, samples
- **Day 14-15**: Testing, bug fixes, documentation, launch

**Total Duration:** 15 days (3 weeks)

## 🔗 Dependencies

- Sprint 3 completion (optional, can work in parallel)
- WebSocket infrastructure ✅
- Redux state management ✅
- Scoring system foundation ✅
- Session management ✅

## 📊 Metrics to Track

- Games played per session
- Average time per round
- Player participation rate
- Correct answer rate by image number
- Manual vs automated scoring usage
- Template usage statistics
- Performance metrics (animation FPS, load times)

## 🎓 Learning Goals

- Complex game state management
- Image optimization and loading
- Advanced animations with Framer Motion
- Template-driven game systems
- Hybrid manual/automated scoring

## 📝 Future Enhancements (Post-Sprint 4)

1. **Video Support**: Reveal video clips instead of static images
2. **Audio Clues**: Play audio hints before image reveals
3. **Multiplayer Modes**: Team vs team, battle royale
4. **Leaderboards**: Global rankings for Bioscope masters
5. **Custom Templates**: User-generated content marketplace
6. **Difficulty Levels**: Easy/Medium/Hard templates
7. **Accessibility**: Screen reader support, high contrast mode

---

**Sprint Start:** October 16, 2025  
**Expected Completion:** November 6, 2025  
**Review Date:** November 7, 2025  
**Priority:** High  
**Estimated Effort:** 15 developer-days

## 🚀 Getting Started

After approval, create branch `feature/sprint4-bioscope` from `feature/sprint3` and begin with Phase 1 backend implementation.
