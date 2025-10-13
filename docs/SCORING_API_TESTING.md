# Scoring System API Testing Guide

## 🎯 Overview
The scoring system is now fully integrated into the Event Management App API. This guide will walk you through testing the new endpoints.

## 🚀 Server Status
✅ API Server is running on `http://localhost:3000`
✅ All scoring endpoints registered successfully:
- `GET /scoring/configs` - List scoring configurations
- `POST /scoring/configs` - Create new scoring configuration
- `PUT /scoring/configs/:id` - Update scoring configuration
- `DELETE /scoring/configs/:id` - Delete scoring configuration
- `POST /scoring/session/:sessionId/attach` - Attach config to session

## 📋 Prerequisites

1. **Authentication Required**: All scoring endpoints require JWT authentication
2. **Role Required**: HOST or ADMIN role
3. **Get a Token**: First, you need to sign up and login to get a JWT token

## 🔐 Step 1: Get Authentication Token

### Sign Up (if you haven't already)
```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "host@example.com",
    "password": "password123",
    "displayName": "Test Host"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "host@example.com",
    "password": "password123"
  }'
```

**Save the token from the response!** You'll need it for all subsequent requests.

## 🎮 Step 2: Create a Scoring Configuration

```bash
curl -X POST http://localhost:3000/scoring/configs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Standard Quiz Scoring",
    "description": "Standard scoring with time multipliers and streaks",
    "mode": "STANDARD",
    "config": {
      "basePoints": 100,
      "timeMultiplier": {
        "enabled": true,
        "maxMultiplier": 2.0,
        "decayRate": 0.5
      },
      "streakBonus": {
        "enabled": true,
        "pointsPerStreak": 10,
        "maxStreakBonus": 100
      },
      "penaltyForIncorrect": 0,
      "customRules": []
    },
    "isDefault": true
  }'
```

### Response Example:
```json
{
  "id": "cm2abc123xyz",
  "name": "Standard Quiz Scoring",
  "description": "Standard scoring with time multipliers and streaks",
  "mode": "STANDARD",
  "hostId": "cm2host123",
  "config": { ... },
  "isDefault": true,
  "createdAt": "2025-10-12T23:19:00.000Z",
  "updatedAt": "2025-10-12T23:19:00.000Z"
}
```

## 📊 Step 3: List Your Scoring Configurations

```bash
curl -X GET http://localhost:3000/scoring/configs \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🎯 Step 4: Create a Session and Attach Scoring

### Create a Session
```bash
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "sessionName": "Sprint 3 Test Game"
  }'
```

### Attach Scoring Configuration to Session
```bash
curl -X POST http://localhost:3000/scoring/session/SESSION_ID_HERE/attach \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "configId": "YOUR_CONFIG_ID_HERE"
  }'
```

## 🎲 Step 5: Test the Scoring Flow

### 1. Start a Quiz Question
```bash
curl -X POST http://localhost:3000/sessions/SESSION_ID/quiz/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "questionId": "q1",
    "prompt": "What is 2 + 2?",
    "options": ["3", "4", "5", "6"],
    "duration": 30
  }'
```

### 2. Have Players Submit Answers
(You'll need to join players first using the `/sessions/join` endpoint)

```bash
curl -X POST http://localhost:3000/sessions/SESSION_ID/quiz/submit \
  -H "Content-Type: application/json" \
  -d '{
    "participantId": "PARTICIPANT_ID",
    "answer": 1
  }'
```

### 3. Reveal the Answer (This triggers automatic scoring!)
```bash
curl -X POST http://localhost:3000/sessions/SESSION_ID/quiz/reveal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "correctOption": 1
  }'
```

**🎉 Scoring happens automatically!** The system will:
- Calculate scores based on correctness
- Apply time multipliers
- Update streak bonuses
- Record scoring history
- Update player statistics

## 📈 Scoring System Features

### Automatic Calculation
When the host reveals an answer, the system automatically:
1. Checks each player's answer for correctness
2. Calculates the time taken to answer
3. Applies the scoring configuration rules:
   - **Base Points**: Starting points for correct answers
   - **Time Multiplier**: Bonus for fast answers
   - **Streak Bonus**: Additional points for consecutive correct answers
   - **Custom Rules**: Any additional rules defined in the config

### Player Statistics Tracked
- Total score
- Current streak
- Max streak achieved
- Total answers submitted
- Correct/incorrect answer counts
- Average answer time
- Fastest answer time

### Scoring History
Every scoring event is recorded with:
- Question ID
- Player ID
- Correctness
- Answer time
- Points awarded
- Detailed breakdown of how points were calculated

## 🛠️ Advanced: Custom Scoring Configuration

### Competition Mode with Penalties
```json
{
  "name": "Competitive Scoring",
  "mode": "COMPETITIVE",
  "config": {
    "basePoints": 100,
    "timeMultiplier": {
      "enabled": true,
      "maxMultiplier": 3.0,
      "decayRate": 0.7
    },
    "streakBonus": {
      "enabled": true,
      "pointsPerStreak": 25,
      "maxStreakBonus": 200
    },
    "penaltyForIncorrect": -10,
    "customRules": []
  }
}
```

### Practice Mode (No Penalties)
```json
{
  "name": "Practice Mode",
  "mode": "PRACTICE",
  "config": {
    "basePoints": 50,
    "timeMultiplier": {
      "enabled": false
    },
    "streakBonus": {
      "enabled": false
    },
    "penaltyForIncorrect": 0,
    "customRules": []
  }
}
```

## 🧪 Testing Checklist

- [ ] Sign up and get authentication token
- [ ] Create a scoring configuration
- [ ] List scoring configurations
- [ ] Update a scoring configuration
- [ ] Create a session
- [ ] Attach scoring config to session
- [ ] Start a quiz question
- [ ] Submit player answers
- [ ] Reveal answer and verify automatic scoring
- [ ] Check player statistics
- [ ] Verify scoring history
- [ ] Test different scoring modes

## 🎬 Next Steps

1. **Frontend Integration**: Update the host dashboard to:
   - Display scoring configuration UI
   - Show real-time score updates
   - Display player statistics

2. **Score Animations**: Enhance the frontend to show:
   - Individual player score changes
   - Streak bonus animations
   - Time multiplier effects

3. **Analytics**: Use the scoring history data to:
   - Generate session reports
   - Show player performance trends
   - Create leaderboards

## 📝 Notes

- All scoring happens automatically when the host reveals an answer
- No need to manually calculate or send score adjustments
- The system handles all the complex scoring logic
- Player statistics are updated in real-time
- Full audit trail maintained in scoring history

---

**🎉 Congratulations!** Your scoring system is fully functional and ready to use!
