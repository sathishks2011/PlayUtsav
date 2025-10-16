import { useState, useMemo, useEffect } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import type { QuizTemplateResponse, QuestionResponse, QuizDifficulty } from '@pkg/core';
import { useAppDispatch } from '../store/hooks';
import { updateQuestion } from '../store/slices/quizTemplateSlice';

interface QuestionGridProps {
  template: QuizTemplateResponse;
  onClose: () => void;
}

type QuestionRow = QuestionResponse & { categoryName: string };

const columnHelper = createColumnHelper<QuestionRow>();

const DebouncedInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  debounce?: number;
  className?: string;
  placeholder?: string;
}> = ({ value: initialValue, onChange, debounce = 500, ...props }) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value, onChange, debounce]);

  return <input {...props} value={value} onChange={(e) => setValue(e.target.value)} />;
};

export default function QuestionGrid({ template, onClose }: QuestionGridProps) {
  const dispatch = useAppDispatch();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<QuestionResponse>>({});
  const [saving, setSaving] = useState(false);

  const allQuestions = useMemo(
    () =>
      template.categories.flatMap((cat) =>
        cat.questions.map((q) => ({
          ...q,
          categoryName: cat.name,
        }))
      ),
    [template.categories]
  );

  const handleEditClick = (question: QuestionRow) => {
    setEditingQuestionId(question.id);
    setEditForm({ ...question });
  };

  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editingQuestionId) return;

    setSaving(true);
    try {
      await dispatch(
        updateQuestion({
          questionId: editingQuestionId,
          data: {
            question: editForm.question,
            options: editForm.options,
            correctAnswer: editForm.correctAnswer,
            displayOrder: editForm.displayOrder,
            difficulty: editForm.difficulty,
            points: editForm.points,
            timeLimit: editForm.timeLimit,
            explanation: editForm.explanation,
            imageUrl: editForm.imageUrl,
          },
        })
      ).unwrap();

      setEditingQuestionId(null);
      setEditForm({});
    } catch (error) {
      console.error('Failed to update question:', error);
      alert('Failed to update question. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(editForm.options || [])];
    newOptions[index] = value;
    setEditForm({ ...editForm, options: newOptions });
  };

  const columns = useMemo<ColumnDef<QuestionRow, any>[]>(
    () => [
      columnHelper.accessor('displayOrder', {
        header: '#',
        cell: (info) => <span className="text-gray-400 font-mono">{info.getValue()}</span>,
        size: 60,
      }),
      columnHelper.accessor('question', {
        header: 'Question',
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('categoryName', {
        header: 'Category',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('difficulty', {
        header: 'Difficulty',
        cell: (info) => (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              info.getValue() === 'EASY'
                ? 'bg-green-900 text-green-200'
                : info.getValue() === 'HARD'
                ? 'bg-red-900 text-red-200'
                : 'bg-yellow-900 text-yellow-200'
            }`}
          >
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('points', {
        header: 'Points',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('timeLimit', {
        header: 'Time (s)',
        cell: (info) => info.getValue(),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <button
            onClick={() => handleEditClick(info.row.original)}
            className="text-blue-400 hover:text-blue-300 font-medium"
            title="Edit question"
          >
            Edit
          </button>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: allQuestions,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        <header className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{template.name}</h1>
            <p className="text-sm text-gray-400">{template.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between gap-4 mb-2">
            <DebouncedInput
              value={globalFilter ?? ''}
              onChange={(value) => setGlobalFilter(String(value))}
              className="flex-1 p-2 text-sm bg-gray-700 text-white border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search all columns..."
            />
            <select
              value={(columnFilters.find((f) => f.id === 'categoryName')?.value as string) || 'all'}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'all') {
                  setColumnFilters(columnFilters.filter((f) => f.id !== 'categoryName'));
                } else {
                  setColumnFilters([
                    ...columnFilters.filter((f) => f.id !== 'categoryName'),
                    { id: 'categoryName', value },
                  ]);
                }
              }}
              className="p-2 text-sm bg-gray-700 text-white border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Filter by category"
              title="Filter by category"
            >
              <option value="all">All Categories</option>
              {template.categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name} (Order: {cat.displayOrder})
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-400">
            💡 Tip: Click column headers to sort. Edit display order to change question sequence within categories.
          </p>
        </div>

        <div className="flex-grow overflow-auto">
          <table className="min-w-full text-sm text-left text-gray-300">
            <thead className="bg-gray-700 text-xs text-gray-300 uppercase tracking-wider">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} scope="col" className="px-6 py-3">
                      <div
                        className="flex items-center cursor-pointer select-none"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ChevronUpIcon className="w-4 h-4 ml-2" />,
                          desc: <ChevronDownIcon className="w-4 h-4 ml-2" />,
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-700">
              {table.getRowModel().rows.map((row) => {
                const isEditing = editingQuestionId === row.original.id;
                return (
                  <>
                    <tr key={row.id} className={isEditing ? 'bg-gray-700' : 'hover:bg-gray-700/50'}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                    {isEditing && (
                      <tr key={`${row.id}-edit`}>
                        <td colSpan={table.getAllColumns().length} className="p-6 bg-gray-750">
                          <div className="space-y-4 max-w-4xl">
                            <h3 className="text-lg font-semibold text-white mb-4">Edit Question</h3>
                            
                            {/* Question Text */}
                            <div>
                              <label htmlFor="edit-question" className="block text-sm font-medium text-gray-300 mb-1">
                                Question Text
                              </label>
                              <input
                                type="text"
                                id="edit-question"
                                value={editForm.question || ''}
                                onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>

                            {/* Options */}
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Options
                              </label>
                              <div className="space-y-2">
                                {editForm.options?.map((opt, index) => (
                                  <div key={index} className="flex items-center gap-2">
                                    <span className="text-gray-400 font-mono w-8">{index}:</span>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => handleOptionChange(index, e.target.value)}
                                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      aria-label={`Option ${index}`}
                                      title={`Option ${index}`}
                                    />
                                    {index === editForm.correctAnswer && (
                                      <span className="text-xs font-semibold text-green-400 bg-green-900 px-2 py-1 rounded">
                                        ✓ Correct
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Correct Answer */}
                            <div>
                              <label htmlFor="edit-correct-answer" className="block text-sm font-medium text-gray-300 mb-1">
                                Correct Answer (Index)
                              </label>
                              <input
                                type="number"
                                id="edit-correct-answer"
                                min="0"
                                max={(editForm.options?.length || 1) - 1}
                                value={editForm.correctAnswer ?? ''}
                                onChange={(e) => setEditForm({ ...editForm, correctAnswer: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>

                            {/* Grid for Display Order, Difficulty, Points, Time Limit */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                <label htmlFor="edit-display-order" className="block text-sm font-medium text-gray-300 mb-1">
                                  Display Order
                                </label>
                                <input
                                  type="number"
                                  id="edit-display-order"
                                  min="0"
                                  value={editForm.displayOrder ?? ''}
                                  onChange={(e) => setEditForm({ ...editForm, displayOrder: parseInt(e.target.value) })}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-400 mt-1">Order within category</p>
                              </div>
                              <div>
                                <label htmlFor="edit-difficulty" className="block text-sm font-medium text-gray-300 mb-1">
                                  Difficulty
                                </label>
                                <select
                                  id="edit-difficulty"
                                  value={editForm.difficulty || 'MEDIUM'}
                                  onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value as QuizDifficulty })}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="EASY">EASY</option>
                                  <option value="MEDIUM">MEDIUM</option>
                                  <option value="HARD">HARD</option>
                                </select>
                              </div>
                              <div>
                                <label htmlFor="edit-points" className="block text-sm font-medium text-gray-300 mb-1">
                                  Points
                                </label>
                                <input
                                  type="number"
                                  id="edit-points"
                                  min="0"
                                  value={editForm.points || ''}
                                  onChange={(e) => setEditForm({ ...editForm, points: parseInt(e.target.value) })}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label htmlFor="edit-time-limit" className="block text-sm font-medium text-gray-300 mb-1">
                                  Time Limit (seconds)
                                </label>
                                <input
                                  type="number"
                                  id="edit-time-limit"
                                  min="0"
                                  value={editForm.timeLimit || ''}
                                  onChange={(e) => setEditForm({ ...editForm, timeLimit: parseInt(e.target.value) })}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            </div>

                            {/* Explanation */}
                            <div>
                              <label htmlFor="edit-explanation" className="block text-sm font-medium text-gray-300 mb-1">
                                Explanation (Optional)
                              </label>
                              <textarea
                                id="edit-explanation"
                                rows={3}
                                value={editForm.explanation || ''}
                                onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>

                            {/* Image URL */}
                            <div>
                              <label htmlFor="edit-image-url" className="block text-sm font-medium text-gray-300 mb-1">
                                Image URL (Optional)
                              </label>
                              <input
                                type="text"
                                id="edit-image-url"
                                value={editForm.imageUrl || ''}
                                onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 pt-4">
                              <button
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                              >
                                {saving ? 'Saving...' : 'Save Changes'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="p-4 border-t border-gray-700 flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <span>
              Page{' '}
              <strong>
                {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </strong>
            </span>
            <span className="text-gray-500">|</span>
            <span className="flex items-center gap-1">
              Go to page:
              <input
                type="number"
                title="Go to page"
                aria-label="Go to page"
                defaultValue={table.getState().pagination.pageIndex + 1}
                onChange={(e) => {
                  const page = e.target.value ? Number(e.target.value) - 1 : 0;
                  table.setPageIndex(page);
                }}
                className="w-16 p-1 bg-gray-700 border border-gray-600 rounded-md"
              />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              title="Rows per page"
              aria-label="Rows per page"
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="p-1 bg-gray-700 border border-gray-600 rounded-md"
            >
              {[10, 20, 50, 100].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  Show {pageSize}
                </option>
              ))}
            </select>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
              title="Next page"
              aria-label="Next page"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
