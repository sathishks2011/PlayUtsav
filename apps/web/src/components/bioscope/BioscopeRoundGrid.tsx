import { useState, useMemo } from 'react';
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
import type { BioscopeTemplate } from '../../store/slices/bioscopeSlice';

interface BioscopeRoundGridProps {
  template: BioscopeTemplate;
  onClose: () => void;
}

type RoundRow = {
  roundId: string;
  roundNumber: number;
  title: string;
  imageCount: number;
  answer: string;
  alternatives: string;
  basePoints: number;
  earlyBonus: number;
  hasHints: boolean;
};

const columnHelper = createColumnHelper<RoundRow>();

export default function BioscopeRoundGrid({ template, onClose }: BioscopeRoundGridProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedRound, setSelectedRound] = useState<RoundRow | null>(null);

  const roundData = useMemo<RoundRow[]>(
    () =>
      template.rounds.map((round, index) => ({
        roundId: round.round_id || `round-${index + 1}`,
        roundNumber: index + 1,
        title: round.title || 'Untitled Round',
        imageCount: round.images?.length || 0,
        answer: round.answer?.title || 'N/A',
        alternatives: round.answer?.alternatives?.join(', ') || 'None',
        basePoints: round.scoring?.base_points || 0,
        earlyBonus: round.scoring?.early_bonus || 0,
        hasHints: round.images?.some((img) => img.hint) || false,
      })),
    [template.rounds]
  );

  const columns = useMemo<ColumnDef<RoundRow, any>[]>(
    () => [
      columnHelper.accessor('roundNumber', {
        header: '#',
        cell: (info) => <span className="text-gray-400 font-mono">{info.getValue()}</span>,
        size: 60,
      }),
      columnHelper.accessor('title', {
        header: 'Round Title',
        cell: (info) => <span className="font-medium text-[var(--fg)]">{info.getValue()}</span>,
      }),
      columnHelper.accessor('imageCount', {
        header: 'Images',
        cell: (info) => (
          <span className="px-2 py-1 rounded-full bg-blue-900/50 text-blue-200 text-xs font-semibold">
            {info.getValue()}
          </span>
        ),
        size: 100,
      }),
      columnHelper.accessor('answer', {
        header: 'Answer',
        cell: (info) => <span className="text-[var(--fg)]/80">{info.getValue()}</span>,
      }),
      columnHelper.accessor('basePoints', {
        header: 'Base Points',
        cell: (info) => <span className="text-emerald-200 font-mono">{info.getValue()}</span>,
        size: 120,
      }),
      columnHelper.accessor('hasHints', {
        header: 'Hints',
        cell: (info) => (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              info.getValue()
                ? 'bg-green-900/50 text-green-200'
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            {info.getValue() ? 'Yes' : 'No'}
          </span>
        ),
        size: 100,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <button
            type="button"
            onClick={() => setSelectedRound(info.row.original)}
            className="text-purple-200 hover:text-purple-100 text-sm font-medium"
          >
            View Details
          </button>
        ),
        size: 120,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: roundData,
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

  const getRoundDetails = (roundRow: RoundRow) => {
    const round = template.rounds.find((r, i) => roundRow.roundNumber === i + 1);
    if (!round) return null;
    return round;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--fg)]">{template.name}</h2>
          <p className="mt-1 text-sm text-[var(--fg)]/70">
            View all rounds and images in this Bioscope template
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-600"
        >
          Back to Templates
        </button>
      </div>

      {/* Global Search */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search rounds..."
          className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-[var(--fg)] placeholder-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20"
        />
        <div className="text-sm text-[var(--fg)]/60">
          {table.getFilteredRowModel().rows.length} of {roundData.length} rounds
        </div>
      </div>

      {/* Template Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-[var(--fg)]/15 bg-[var(--card)]/70 p-4">
          <p className="text-xs uppercase tracking-wider text-[var(--fg)]/50">Total Rounds</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--fg)]">{template.rounds.length}</p>
        </div>
        <div className="rounded-lg border border-[var(--fg)]/15 bg-[var(--card)]/70 p-4">
          <p className="text-xs uppercase tracking-wider text-[var(--fg)]/50">Total Images</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--fg)]">
            {template.rounds.reduce((sum, r) => sum + (r.images?.length || 0), 0)}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--fg)]/15 bg-[var(--card)]/70 p-4">
          <p className="text-xs uppercase tracking-wider text-[var(--fg)]/50">Timer</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--fg)]">
            {template.configuration?.timer_seconds || 30}s
          </p>
        </div>
        <div className="rounded-lg border border-[var(--fg)]/15 bg-[var(--card)]/70 p-4">
          <p className="text-xs uppercase tracking-wider text-[var(--fg)]/50">Manual Scoring</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--fg)]">
            {template.configuration?.allow_manual_scoring ? 'On' : 'Off'}
          </p>
        </div>
      </div>

      {/* Rounds Table */}
      <div className="overflow-hidden rounded-lg border border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const width = header.getSize() !== 150 ? header.getSize() : undefined;
                    return (
                      <th
                        key={header.id}
                        className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 ${width ? `w-[${width}px]` : ''}`}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={`flex items-center gap-2 ${
                              header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                            }`}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && (
                              <span className="text-gray-500">
                                {header.column.getIsSorted() === 'asc' ? (
                                  <ChevronUpIcon className="h-4 w-4" />
                                ) : header.column.getIsSorted() === 'desc' ? (
                                  <ChevronDownIcon className="h-4 w-4" />
                                ) : (
                                  <span className="opacity-30">⇅</span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-700 bg-gray-900">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-800/50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm text-[var(--fg)]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-700 bg-gray-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded border border-gray-600 p-1 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Previous page"
              title="Previous page"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-300" />
            </button>
            <span className="text-sm text-gray-300">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded border border-gray-600 p-1 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Next page"
              title="Next page"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-300" />
            </button>
          </div>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-gray-200"
            aria-label="Rows per page"
            title="Rows per page"
          >
            {[10, 20, 30, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Round Details Modal */}
      {selectedRound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-[var(--fg)]">
                  Round {selectedRound.roundNumber}: {selectedRound.title}
                </h3>
                <p className="mt-1 text-sm text-[var(--fg)]/60">
                  Detailed view of round configuration and images
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRound(null)}
                className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-600"
              >
                Close
              </button>
            </div>

            {(() => {
              const round = getRoundDetails(selectedRound);
              if (!round) return <p className="text-gray-400">Round not found</p>;

              return (
                <div className="space-y-6">
                  {/* Answer */}
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <p className="text-xs uppercase tracking-wider text-emerald-200/70">Answer</p>
                    <p className="mt-2 text-lg font-semibold text-emerald-100">{round.answer?.title}</p>
                    {round.answer?.alternatives && round.answer.alternatives.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-emerald-200/60">Alternatives:</p>
                        <p className="text-sm text-emerald-100">{round.answer.alternatives.join(', ')}</p>
                      </div>
                    )}
                  </div>

                  {/* Scoring */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-[var(--fg)]/15 bg-[var(--card)]/70 p-4">
                      <p className="text-xs uppercase tracking-wider text-[var(--fg)]/50">Base Points</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--fg)]">
                        {round.scoring?.base_points || 0}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--fg)]/15 bg-[var(--card)]/70 p-4">
                      <p className="text-xs uppercase tracking-wider text-[var(--fg)]/50">Early Bonus</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--fg)]">
                        {round.scoring?.early_bonus || 0}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--fg)]/15 bg-[var(--card)]/70 p-4">
                      <p className="text-xs uppercase tracking-wider text-[var(--fg)]/50">Final Image Points</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--fg)]">
                        {round.scoring?.final_image_points || 0}
                      </p>
                    </div>
                  </div>

                  {/* Images */}
                  <div>
                    <h4 className="text-lg font-semibold text-[var(--fg)] mb-4">Images ({round.images?.length || 0})</h4>
                    <div className="space-y-3">
                      {round.images?.map((image, idx) => (
                        <div
                          key={image.id || idx}
                          className="rounded-lg border border-[var(--fg)]/15 bg-[var(--card)]/70 p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-[var(--fg)]">
                                Image {idx + 1}
                                {image.hint && ` - ${image.hint}`}
                              </p>
                              <p className="mt-1 text-sm text-[var(--fg)]/60 font-mono">{image.file}</p>
                            </div>
                            <span className="rounded-full bg-blue-900/50 px-3 py-1 text-xs font-semibold text-blue-200">
                              {image.points_multiplier || 1}x points
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
