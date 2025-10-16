import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import type { CategoryResponse } from '@pkg/core';

interface RoundSelectorProps {
  categories: CategoryResponse[];
  currentCategoryIndex: number;
  currentQuestionIndex: number;
  onRoundChange: (categoryIndex: number, questionIndex: number) => void;
  disabled?: boolean;
}

export const RoundSelector: React.FC<RoundSelectorProps> = ({
  categories,
  currentCategoryIndex,
  currentQuestionIndex,
  onRoundChange,
  disabled = false,
}) => {
  const currentCategory = categories[currentCategoryIndex];
  const currentQuestionCount = currentCategory?.questions?.length || 0;

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategoryIndex = parseInt(event.target.value, 10);
    // Reset to first question when changing rounds
    onRoundChange(newCategoryIndex, 0);
  };

  const handleQuestionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newQuestionIndex = parseInt(event.target.value, 10);
    onRoundChange(currentCategoryIndex, newQuestionIndex);
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
      {/* Round/Category Selector */}
      <div className="flex-1">
        <label htmlFor="round-select" className="block text-xs font-medium text-gray-400 mb-1">
          Quiz Round
        </label>
        <div className="relative">
          <select
            id="round-select"
            value={currentCategoryIndex}
            onChange={handleCategoryChange}
            disabled={disabled}
            className="w-full appearance-none bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {categories.map((category, index) => (
              <option key={category.id} value={index}>
                Round {index + 1}: {category.name} ({category.questions.length} questions)
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Question Selector */}
      <div className="flex-1">
        <label htmlFor="question-select" className="block text-xs font-medium text-gray-400 mb-1">
          Question
        </label>
        <div className="relative">
          <select
            id="question-select"
            value={currentQuestionIndex}
            onChange={handleQuestionChange}
            disabled={disabled || currentQuestionCount === 0}
            className="w-full appearance-none bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentCategory?.questions.map((question, index) => (
              <option key={question.id} value={index}>
                Q{index + 1}: {question.question.substring(0, 40)}
                {question.question.length > 40 ? '...' : ''}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Navigation Info */}
      <div className="text-sm text-gray-400">
        <div className="text-center">
          <div className="font-medium text-white">
            {currentCategoryIndex + 1} / {categories.length}
          </div>
          <div className="text-xs">Rounds</div>
        </div>
      </div>
    </div>
  );
};
