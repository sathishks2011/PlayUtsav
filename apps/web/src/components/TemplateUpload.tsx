import { useState, useRef, ChangeEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { uploadTemplate, setUploadProgress } from '../store/slices/quizTemplateSlice';
import type { QuizTemplateDTO } from '@pkg/core';

interface TemplateUploadProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function TemplateUpload({ onClose, onSuccess }: TemplateUploadProps) {
  const dispatch = useAppDispatch();
  const { uploading, uploadProgress, error } = useAppSelector((state) => state.quizTemplate);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [templateData, setTemplateData] = useState<QuizTemplateDTO | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateTemplate = (data: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Basic structure validation
    if (!data.templateName || typeof data.templateName !== 'string') {
      errors.push('Template must have a valid templateName');
    } else if (data.templateName.length < 1 || data.templateName.length > 200) {
      errors.push('Template name must be between 1 and 200 characters');
    }

    if (!Array.isArray(data.categories) || data.categories.length === 0) {
      errors.push('Template must have at least one category');
    } else {
      // Validate categories
      const categoryNames = new Set<string>();
      const categoryOrders = new Set<number>();

      data.categories.forEach((category: any, catIndex: number) => {
        const catNum = catIndex + 1;

        if (!category.categoryName || typeof category.categoryName !== 'string') {
          errors.push(`Category ${catNum}: missing or invalid categoryName`);
        } else {
          if (categoryNames.has(category.categoryName)) {
            errors.push(`Category "${category.categoryName}": duplicate category name`);
          }
          categoryNames.add(category.categoryName);
        }

        if (typeof category.displayOrder !== 'number') {
          errors.push(`Category ${catNum}: missing or invalid displayOrder`);
        } else {
          if (categoryOrders.has(category.displayOrder)) {
            errors.push(`Category ${catNum}: duplicate displayOrder ${category.displayOrder}`);
          }
          categoryOrders.add(category.displayOrder);
        }

        if (!Array.isArray(category.questions) || category.questions.length === 0) {
          errors.push(`Category ${catNum}: must have at least one question`);
        } else {
          // Validate questions
          const questionOrders = new Set<number>();

          category.questions.forEach((question: any, qIndex: number) => {
            const qNum = qIndex + 1;
            const prefix = `Category "${category.categoryName}", Question ${qNum}`;

            if (!question.question || typeof question.question !== 'string') {
              errors.push(`${prefix}: missing or invalid question text`);
            } else if (question.question.length < 1 || question.question.length > 500) {
              errors.push(`${prefix}: question text must be between 1 and 500 characters`);
            }

            if (!Array.isArray(question.options)) {
              errors.push(`${prefix}: missing or invalid options array`);
            } else if (question.options.length < 2 || question.options.length > 6) {
              errors.push(`${prefix}: must have between 2 and 6 options`);
            } else {
              question.options.forEach((option: any, oIndex: number) => {
                if (typeof option !== 'string' || option.length < 1 || option.length > 200) {
                  errors.push(`${prefix}, Option ${oIndex + 1}: must be a string between 1 and 200 characters`);
                }
              });
            }

            if (typeof question.correctAnswer !== 'number') {
              errors.push(`${prefix}: missing or invalid correctAnswer`);
            } else if (question.correctAnswer < 0 || question.correctAnswer >= (question.options?.length || 0)) {
              errors.push(`${prefix}: correctAnswer must be a valid index (0 to ${(question.options?.length || 0) - 1})`);
            }

            if (typeof question.displayOrder !== 'number') {
              errors.push(`${prefix}: missing or invalid displayOrder`);
            } else {
              if (questionOrders.has(question.displayOrder)) {
                errors.push(`${prefix}: duplicate displayOrder ${question.displayOrder}`);
              }
              questionOrders.add(question.displayOrder);
            }

            // Validate optional fields
            if (question.difficulty !== undefined) {
              const validDifficulties = ['EASY', 'MEDIUM', 'HARD'];
              if (!validDifficulties.includes(question.difficulty)) {
                errors.push(`${prefix}: difficulty must be EASY, MEDIUM, or HARD`);
              }
            }

            if (question.points !== undefined) {
              if (typeof question.points !== 'number' || question.points < 1 || question.points > 1000) {
                errors.push(`${prefix}: points must be a number between 1 and 1000`);
              }
            }

            if (question.timeLimit !== undefined) {
              if (typeof question.timeLimit !== 'number' || question.timeLimit < 10 || question.timeLimit > 300) {
                errors.push(`${prefix}: timeLimit must be a number between 10 and 300 seconds`);
              }
            }

            if (question.explanation !== undefined) {
              if (typeof question.explanation !== 'string' || question.explanation.length > 1000) {
                errors.push(`${prefix}: explanation must be a string up to 1000 characters`);
              }
            }

            if (question.imageUrl !== undefined) {
              if (typeof question.imageUrl !== 'string' || question.imageUrl.length > 500) {
                errors.push(`${prefix}: imageUrl must be a string up to 500 characters`);
              }
            }
          });
        }
      });
    }

    return { isValid: errors.length === 0, errors };
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setValidationErrors([]);
    setTemplateData(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate the template
      const validation = validateTemplate(data);

      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        return;
      }

      setTemplateData(data as QuizTemplateDTO);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setValidationErrors(['Invalid JSON format. Please check your file.']);
      } else {
        setValidationErrors(['Failed to read file. Please try again.']);
      }
    }
  };

  const handleUpload = async () => {
    if (!templateData) return;

    dispatch(setUploadProgress(0));

    // Simulate progress (since we don't have actual progress from fetch)
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress = Math.min(currentProgress + 10, 90);
      dispatch(setUploadProgress(currentProgress));
    }, 200);

    try {
      await dispatch(uploadTemplate(templateData)).unwrap();
      clearInterval(progressInterval);
      dispatch(setUploadProgress(100));
      
      // Show success briefly before closing
      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch (err) {
      clearInterval(progressInterval);
      dispatch(setUploadProgress(0));
      // Error is handled by Redux state
    }
  };

  const handleReset = () => {
    setTemplateData(null);
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Quiz Template</h1>
          <p className="text-gray-600">
            Select a JSON file containing your quiz questions and answers.
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close upload dialog"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Upload Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-sm font-medium text-red-800 mb-1">Upload Failed</h3>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">Validation Errors</h3>
          <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* File Input */}
      {!templateData && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Select a template file</h3>
          <p className="mt-1 text-sm text-gray-500">JSON files only</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
          >
            Choose File
          </label>
        </div>
      )}

      {/* Template Preview */}
      {templateData && !uploading && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Preview</h3>
          <div className="space-y-3 mb-6">
            <div>
              <span className="font-medium text-gray-700">Name:</span>
              <span className="ml-2 text-gray-900">{templateData.templateName}</span>
            </div>
            {templateData.templateDescription && (
              <div>
                <span className="font-medium text-gray-700">Description:</span>
                <p className="ml-2 text-gray-900 mt-1">{templateData.templateDescription}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700">Categories:</span>
              <span className="ml-2 text-gray-900">{templateData.categories.length}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Total Questions:</span>
              <span className="ml-2 text-gray-900">
                {templateData.categories.reduce((sum, cat) => sum + cat.questions.length, 0)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Upload Template
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Choose Different File
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploading Template...</h3>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(uploadProgress, 100)}%` }}
            />
          </div>
          <p className="text-center text-sm text-gray-600">{uploadProgress}%</p>
        </div>
      )}
    </div>
  );
}
