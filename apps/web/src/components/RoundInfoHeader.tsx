import React from 'react';
import { TrophyIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface RoundInfoHeaderProps {
  templateName: string;
  categoryName: string;
  currentCategoryIndex: number;
  currentQuestionIndex: number;
  totalCategories: number;
  totalQuestionsInCategory: number;
  className?: string;
}

export const RoundInfoHeader: React.FC<RoundInfoHeaderProps> = ({
  templateName,
  categoryName,
  currentCategoryIndex,
  currentQuestionIndex,
  totalCategories,
  totalQuestionsInCategory,
  className = '',
}) => {
  return (
    <div className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-lg shadow-lg ${className}`}>
      <div className="flex items-center justify-between">
        {/* Left: Template Name */}
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5" />
          <div>
            <div className="text-xs font-medium opacity-90">Quiz Template</div>
            <div className="font-bold text-lg">{templateName}</div>
          </div>
        </div>

        {/* Center: Round Info */}
        <div className="flex items-center gap-3">
          <div className="text-center px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <div className="text-xs font-medium opacity-90">Round</div>
            <div className="font-bold text-xl">
              {currentCategoryIndex + 1} / {totalCategories}
            </div>
          </div>
          <div className="text-center px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <div className="text-xs font-medium opacity-90">Question</div>
            <div className="font-bold text-xl">
              {currentQuestionIndex + 1} / {totalQuestionsInCategory}
            </div>
          </div>
        </div>

        {/* Right: Category Name */}
        <div className="flex items-center gap-2">
          <TrophyIcon className="h-5 w-5" />
          <div className="text-right">
            <div className="text-xs font-medium opacity-90">Current Round</div>
            <div className="font-bold text-lg">{categoryName}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
