import type { GameInstance, Session } from './types';

/**
 * Transforms a backend session payload into the richer frontend-friendly shape
 * that includes the `games` collection and active game metadata.
 *
 * @param backendSession Raw session object returned by the API
 * @param preserveActiveGameIndex Optional game index to keep when backend omits or resets it
 */
export function transformSession(backendSession: any, preserveActiveGameIndex?: number): Session {
  if (!backendSession) {
    throw new Error('[transformSession] backendSession is required');
  }

  const games: GameInstance[] = [];

  if (backendSession.quizTemplateId) {
    games.push({
      id: `quiz-${backendSession.quizTemplateId}`,
      type: 'quiz',
      templateId: backendSession.quizTemplateId,
      name: backendSession.quizTemplate?.name || 'Quiz Game',
      state: {
        currentCategoryIndex: backendSession.currentCategoryIndex || 0,
        currentQuestionIndex: backendSession.currentQuestionIndex || 0,
        template: backendSession.quizTemplate,
      },
    });
  }

  if (backendSession.bioscopeSession) {
    games.push({
      id: `bioscope-${backendSession.bioscopeSession.id}`,
      type: 'bioscope',
      templateId: backendSession.bioscopeSession.templateId || backendSession.bioscopeSession.id,
      name: backendSession.bioscopeSession.template?.name || 'Bioscope Game',
      state: backendSession.bioscopeSession,
    });
  }

  const hasPreserveIndex =
    preserveActiveGameIndex !== undefined &&
    preserveActiveGameIndex >= 0 &&
    preserveActiveGameIndex < games.length;

  const activeGameIndex = hasPreserveIndex ? preserveActiveGameIndex! : 0;

  console.log(
    '[transformSession] preserveActiveGameIndex:',
    preserveActiveGameIndex,
    '-> activeGameIndex:',
    activeGameIndex,
    'games:',
    games.length,
  );

  return {
    ...backendSession,
    games,
    activeGameIndex,
  } as Session;
}
