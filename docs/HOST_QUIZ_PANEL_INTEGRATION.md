# HostQuizPanel Integration Guide

## Overview
The HostQuizPanel currently uses `SAMPLE_QUESTIONS` array. We need to integrate it with quiz templates so it uses questions from the attached template instead.

## Required Changes

### 1. Import New Components and API
Add these imports at the top:
```typescript
import { RoundSelector } from './RoundSelector';
import { RoundInfoHeader } from './RoundInfoHeader';
import { getRoundQuestions, updateRound } from '../lib/api';
import type { QuestionResponse, CategoryResponse } from '@pkg/core';
```

### 2. Add State for Template Questions
Replace/augment the current question management:
```typescript
// Add these state variables
const [templateQuestions, setTemplateQuestions] = useState<QuestionResponse[]>([]);
const [categories, setCategories] = useState<CategoryResponse[]>([]);
const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
const [templateName, setTemplateName] = useState('');
const [usingTemplate, setUsingTemplate] = useState(false);

// Keep existing questionIndex state for SAMPLE_QUESTIONS fallback
const [questionIndex, setQuestionIndex] = useState(0);
```

### 3. Load Template Questions on Mount
Add this effect to fetch template questions if a template is attached:
```typescript
useEffect(() => {
  if (!session?.id || !session.quizTemplateId) {
    setUsingTemplate(false);
    return;
  }

  // Fetch template questions
  getRoundQuestions(session.id)
    .then((roundInfo) => {
      setTemplateQuestions(roundInfo.questions);
      setCategories(session.quizTemplate?.categories || []);
      setCurrentCategoryIndex(roundInfo.session.currentCategoryIndex);
      setCurrentQuestionIndex(roundInfo.session.currentQuestionIndex);
      setTemplateName(roundInfo.template.name);
      setUsingTemplate(true);
    })
    .catch((error) => {
      console.error('[HostQuizPanel] Failed to load template questions:', error);
      setUsingTemplate(false);
    });
}, [session?.id, session?.quizTemplateId]);
```

### 4. Update Question Source
Replace the current question memoization:
```typescript
// OLD:
const question = useMemo(() => SAMPLE_QUESTIONS[questionIndex % SAMPLE_QUESTIONS.length], [questionIndex]);

// NEW:
const question = useMemo(() => {
  if (usingTemplate && templateQuestions.length > 0) {
    const currentQuestion = templateQuestions[currentQuestionIndex];
    if (!currentQuestion) return SAMPLE_QUESTIONS[0];
    
    return {
      questionId: currentQuestion.id,
      prompt: currentQuestion.question,
      options: currentQuestion.options,
      correct: currentQuestion.correctAnswer,
      duration: currentQuestion.timeLimit || 30,
      points: currentQuestion.points || 10,
    };
  }
  
  // Fallback to sample questions
  return SAMPLE_QUESTIONS[questionIndex % SAMPLE_QUESTIONS.length];
}, [usingTemplate, templateQuestions, currentQuestionIndex, questionIndex]);
```

### 5. Add Round Navigation Handler
```typescript
const handleRoundChange = async (categoryIndex: number, questionIndex: number) => {
  if (!session?.id) return;
  
  try {
    await updateRound(session.id, categoryIndex, questionIndex);
    
    // Fetch new questions for the selected round
    const roundInfo = await getRoundQuestions(session.id);
    setTemplateQuestions(roundInfo.questions);
    setCurrentCategoryIndex(categoryIndex);
    setCurrentQuestionIndex(questionIndex);
  } catch (error) {
    console.error('[HostQuizPanel] Failed to change round:', error);
  }
};
```

### 6. Update Next Question Logic
Modify the handleReveal or next question logic to support rounds:
```typescript
const handleNextQuestion = async () => {
  if (!usingTemplate) {
    // Existing logic for SAMPLE_QUESTIONS
    setQuestionIndex((prev) => prev + 1);
    return;
  }

  // Template mode - advance to next question or next round
  const currentCategory = categories[currentCategoryIndex];
  if (!currentCategory) return;

  if (currentQuestionIndex < currentCategory.questions.length - 1) {
    // More questions in current round
    await handleRoundChange(currentCategoryIndex, currentQuestionIndex + 1);
  } else if (currentCategoryIndex < categories.length - 1) {
    // Move to next round
    await handleRoundChange(currentCategoryIndex + 1, 0);
  } else {
    // Quiz complete
    alert('Quiz complete! All rounds finished.');
  }
};
```

### 7. Add UI Components to Render
In the render/return section, add the new components:
```tsx
return (
  <div className="flex flex-col gap-4">
    {/* Show Round Info Header when using template */}
    {usingTemplate && categories.length > 0 && (
      <RoundInfoHeader
        templateName={templateName}
        categoryName={categories[currentCategoryIndex]?.name || ''}
        currentCategoryIndex={currentCategoryIndex}
        currentQuestionIndex={currentQuestionIndex}
        totalCategories={categories.length}
        totalQuestionsInCategory={templateQuestions.length}
      />
    )}

    {/* Show Round Selector for host controls */}
    {showHostControls && usingTemplate && categories.length > 0 && (
      <RoundSelector
        categories={categories}
        currentCategoryIndex={currentCategoryIndex}
        currentQuestionIndex={currentQuestionIndex}
        onRoundChange={handleRoundChange}
        disabled={quizState?.status === 'running'}
      />
    )}

    {/* Rest of existing UI... */}
  </div>
);
```

### 8. Update Awards Calculation
Modify the awards calculation to use template points:
```typescript
const awards = session.teams
  .filter((team) =>
    team.participants.some((p) =>
      quizState.answers.some((ans) => ans.participantId === p.id && ans.answer === question.correct)
    )
  )
  .map((team) => ({ 
    teamId: team.id, 
    delta: question.points || 10, // Use question points from template
    reason: 'quiz-correct' 
  }));
```

## Testing Checklist
- [ ] Component loads with no template attached (uses SAMPLE_QUESTIONS)
- [ ] Component loads with template attached (fetches template questions)
- [ ] Round selector displays all categories
- [ ] Selecting a round changes questions
- [ ] Selecting a question updates the display
- [ ] Auto-advancing to next question works
- [ ] Auto-advancing to next round works
- [ ] Quiz complete message shows after last question
- [ ] Host controls are disabled during running quiz
- [ ] WebSocket updates propagate correctly
- [ ] Scoring uses template points

## Notes
- Keep SAMPLE_QUESTIONS as a fallback for sessions without templates
- The component should gracefully handle both modes
- Round navigation should be disabled while a question is running
- Template questions are fetched via API, not from Redux (for now)
- Future enhancement: Store round info in Redux for better state management
