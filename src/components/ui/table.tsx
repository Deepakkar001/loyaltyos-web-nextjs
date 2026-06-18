"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AnimatedSelect } from "@/components/ui/animated-select";
import { cn } from "@/lib/utils";

export type { ColumnDef };

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: "left" | "center" | "right";
    headerClassName?: string;
    cellClassName?: string;
    /** Include this column in global search (default: true). */
    searchable?: boolean;
  }
}

export type AppTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  ariaLabel: string;
  title?: ReactNode;
  description?: ReactNode;
  headerActions?: ReactNode;
  className?: string;
  tableClassName?: string;
  minTableWidth?: string;
  /** Show built-in search field (default: true). Client-side only — filters current `data`. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Shown when search is active but no rows match. */
  noSearchResultsMessage?: ReactNode;
  /** Client-side search across stringified cell values. */
  onSearchChange?: (query: string) => void;
  /** Include serial number column (default: true). */
  showSerialNumber?: boolean;
  serialHeader?: string;
  /** Optional extra row-count options (merged with auto-generated 5, 10, 15, …). */
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  emptyMessage?: ReactNode;
  getRowId?: (row: TData, index: number) => string;
  /** Custom global filter; defaults to lowercase text match across row values. */
  globalFilterFn?: (row: Row<TData>, query: string) => boolean;
  /** Render without outer Card — for tables inside an existing card/panel. */
  embedded?: boolean;
};

function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

/** Collect searchable text from any cell / row value (dynamic — no column hardcoding). */
function collectSearchableText(value: unknown): string[] {
  if (value == null) return [];

  if (typeof value === "string" || typeof value === "boolean" || typeof value === "bigint") {
    return [String(value).toLowerCase()];
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const raw = String(value).toLowerCase();
    const formatted = value.toLocaleString().toLowerCase();
    return [raw, formatted, formatted.replace(/,/g, "")];
  }

  if (value instanceof Date) {
    return [value.toISOString().toLowerCase(), value.toLocaleDateString().toLowerCase()];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectSearchableText);
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(collectSearchableText);
  }

  return [String(value).toLowerCase()];
}

function rowSearchHaystack<TData>(row: Row<TData>): string[] {
  const parts = collectSearchableText(row.original);

  for (const cell of row.getVisibleCells()) {
    if (cell.column.id === "_serial") continue;
    if (cell.column.columnDef.meta?.searchable === false) continue;
    parts.push(...collectSearchableText(cell.getValue()));
  }

  return parts;
}

function defaultGlobalFilterFn<TData>(row: Row<TData>, query: string): boolean {
  const q = normalizeSearchQuery(query);
  if (!q) return true;
  return rowSearchHaystack(row).some((part) => part.includes(q));
}

function resolveColumnHeaderLabel<TData>(column: ColumnDef<TData, unknown>): string | null {
  const { header } = column;
  if (typeof header === "string") return header;
  return null;
}

/** Build placeholder from visible column headers when none is provided. */
function buildSearchPlaceholder<TData>(columns: ColumnDef<TData, unknown>[]): string {
  const labels = columns
    .map(resolveColumnHeaderLabel)
    .filter((label): label is string => Boolean(label));

  if (labels.length === 0) return "Search table…";
  if (labels.length === 1) return `Search ${labels[0].toLowerCase()}…`;
  if (labels.length === 2) return `Search ${labels[0].toLowerCase()} or ${labels[1].toLowerCase()}…`;
  return `Search ${labels.slice(0, -1).join(", ").toLowerCase()}, or ${labels[labels.length - 1]!.toLowerCase()}…`;
}

const PAGE_SIZE_STEP = 5;

/** Build row-size options in steps of 5, with the last option capped at total entries. */
export function buildPageSizeOptions(totalRows: number, step = PAGE_SIZE_STEP): number[] {
  if (totalRows <= 0) return [step];

  if (totalRows < step) return [totalRows];

  const options: number[] = [];
  for (let size = step; size < totalRows; size += step) {
    options.push(size);
  }
  options.push(totalRows);
  return options;
}

/** Pick page size from loaded row count — use exact count when below step, else prefer default. */
function resolveInitialPageSize(totalRows: number, preferredPageSize: number, step = PAGE_SIZE_STEP): number {
  if (totalRows <= 0) return preferredPageSize;

  if (totalRows < step) return totalRows;

  const options = buildPageSizeOptions(totalRows, step);
  const target = Math.min(preferredPageSize, totalRows);

  if (options.includes(target)) return target;

  const fitsAll = options.find((size) => size >= totalRows);
  if (target >= totalRows && fitsAll) return fitsAll;

  const preferredInList = options.find((size) => size >= preferredPageSize);
  return preferredInList ?? options[options.length - 1] ?? step;
}

function buildPageRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, "ellipsis", total - 2, total - 1, total];
  }
  if (current >= total - 2) {
    return [1, 2, 3, "ellipsis", total - 2, total - 1, total];
  }
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

function alignClass(align?: "left" | "center" | "right") {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

/** Fit columns to content; w-0 lets table-auto use min-content widths. */
function headerColumnClass() {
  return "w-0 whitespace-nowrap";
}

function cellColumnClass(columnId: string, align?: "left" | "center" | "right") {
  if (columnId === "_serial" || align === "right") {
    return "w-0 whitespace-nowrap";
  }
  return "w-0";
}

export function AppTable<TData>({
  data,
  columns,
  ariaLabel,
  title,
  description,
  headerActions,
  className,
  tableClassName,
  minTableWidth = "",
  searchable = true,
  searchPlaceholder,
  noSearchResultsMessage,
  onSearchChange,
  showSerialNumber = true,
  serialHeader = "Sl No.",
  pageSizeOptions,
  defaultPageSize = 10,
  emptyMessage = "No results.",
  getRowId,
  globalFilterFn,
  embedded = false,
}: AppTableProps<TData>) {
  const [globalFilter, setGlobalFilter] = useState("");
  const deferredGlobalFilter = useDeferredValue(globalFilter);
  const [pagination, setPagination] = useState(() => ({
    pageIndex: 0,
    pageSize: resolveInitialPageSize(data.length, defaultPageSize),
  }));

  const resolvedSearchPlaceholder = useMemo(
    () => searchPlaceholder ?? buildSearchPlaceholder(columns),
    [columns, searchPlaceholder],
  );

  const dataFingerprint = useMemo(() => {
    return data
      .map((row, index) => (getRowId ? getRowId(row, index) : JSON.stringify(row)))
      .join("\u0000");
  }, [data, getRowId]);

  useEffect(() => {
    setGlobalFilter("");
  }, [dataFingerprint]);

  const tableColumns = useMemo(() => {
    const serialColumn: ColumnDef<TData, unknown> = {
      id: "_serial",
      header: serialHeader,
      enableSorting: false,
      meta: { align: "left", searchable: false },
      cell: ({ row, table }) => {
        const { pageIndex, pageSize } = table.getState().pagination;
        return pageIndex * pageSize + row.index + 1;
      },
    };

    return showSerialNumber ? [serialColumn, ...columns] : columns;
  }, [columns, serialHeader, showSerialNumber]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: getRowId ? (row, index) => getRowId(row, index) : undefined,
    globalFilterFn: (row, _columnId, filterValue) =>
      (globalFilterFn ?? defaultGlobalFilterFn)(row, String(filterValue ?? "")),
    state: {
      globalFilter: deferredGlobalFilter,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
  });

  const handleSearch = (value: string) => {
    setGlobalFilter(value);
    onSearchChange?.(value);
    table.setPageIndex(0);
  };

  const totalRows = table.getFilteredRowModel().rows.length;
  const rawRowCount = data.length;
  const hasActiveSearch = globalFilter.trim().length > 0;
  const isSearchPending = hasActiveSearch && globalFilter !== deferredGlobalFilter;
  const displayEmptyMessage =
    hasActiveSearch && totalRows === 0
      ? (noSearchResultsMessage ?? `No rows match "${globalFilter.trim()}".`)
      : emptyMessage;
  const resolvedPageSizeOptions = useMemo(() => {
    const auto = buildPageSizeOptions(totalRows);
    if (!pageSizeOptions?.length) return auto;

    const max = totalRows > 0 ? totalRows : PAGE_SIZE_STEP;
    const merged = Array.from(
      new Set([...auto, ...pageSizeOptions.filter((size) => size <= max)]),
    ).sort((a, b) => a - b);
    return merged.length ? merged : auto;
  }, [totalRows, pageSizeOptions]);

  useEffect(() => {
    setPagination((prev) => {
      let nextPageSize = resolvedPageSizeOptions.includes(prev.pageSize)
        ? prev.pageSize
        : resolveInitialPageSize(totalRows, defaultPageSize);

      if (!resolvedPageSizeOptions.includes(nextPageSize)) {
        nextPageSize = resolvedPageSizeOptions[resolvedPageSizeOptions.length - 1] ?? defaultPageSize;
      }

      if (prev.pageIndex === 0 && prev.pageSize === nextPageSize) {
        return prev;
      }

      return { pageIndex: 0, pageSize: nextPageSize };
    });
  }, [totalRows, defaultPageSize, resolvedPageSizeOptions]);

  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const start = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const end = totalRows === 0 ? 0 : Math.min((pageIndex + 1) * pageSize, totalRows);
  const pageRange = buildPageRange(pageIndex + 1, Math.max(pageCount, 1));

  const showHeader = !embedded && (title || description || headerActions || searchable);

  const searchField = searchable ? (
    <div className="relative w-full max-w-xs">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={globalFilter}
        onChange={(event) => handleSearch(event.target.value)}
        placeholder={resolvedSearchPlaceholder}
        aria-label={resolvedSearchPlaceholder}
        className={cn("h-10 pl-9", globalFilter && "pr-9")}
      />
      {globalFilter ? (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => handleSearch("")}
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  ) : null;

  const tableMarkup = (
    <>
      {showHeader ? (
        <CardHeader className="gap-4 border-b border-border/60 px-6 py-5">
          {(title || description || headerActions) && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              {(title || description) && (
                <div className="space-y-1">
                  {title ? <CardTitle className="text-lg font-semibold">{title}</CardTitle> : null}
                  {description ? <CardDescription>{description}</CardDescription> : null}
                </div>
              )}
              {headerActions ? <div className="flex shrink-0 flex-wrap gap-2">{headerActions}</div> : null}
            </div>
          )}
          {searchField}
        </CardHeader>
      ) : null}

      {searchable && embedded ? (
        <div className="mb-3 flex justify-end">{searchField}</div>
      ) : null}

      <CardContent className={cn("overflow-x-auto px-0", embedded && "pt-0")}>
        <div
          className={cn(
            "overflow-hidden rounded-xl border border-gray-200/90 bg-white",
            "shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]",
            "dark:border-white/10 dark:bg-[var(--surface-card)]",
            "dark:shadow-[0_4px_14px_rgba(0,0,0,0.35),0_1px_4px_rgba(0,0,0,0.25)]",
            isSearchPending && "opacity-80",
          )}
        >
          <table
            aria-label={ariaLabel}
            className={cn("w-full table-auto border-collapse text-left", minTableWidth, tableClassName)}
          >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-zinc-900 text-white dark:bg-zinc-950">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        "px-4 py-3.5 text-base font-semibold tracking-normal text-white",
                        headerColumnClass(),
                        alignClass(header.column.columnDef.meta?.align),
                        header.column.columnDef.meta?.headerClassName,
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableColumns.length}
                    className="bg-white px-4 py-10 text-center text-base font-medium tracking-normal text-muted-foreground dark:bg-transparent"
                  >
                    {displayEmptyMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, rowIndex) => {
                  const isEven = rowIndex % 2 === 1;
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition-colors",
                        isEven
                          ? "bg-[#eef0ffed] hover:bg-gray-100/80 dark:bg-white/[0.08] dark:hover:bg-white/[0.06]"
                          : "bg-white hover:bg-gray-50/60 dark:bg-transparent dark:hover:bg-white/[0.03]",
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn(
                            "border-b border-gray-100 px-4 py-3.5 text-sm text-foreground",
                            "dark:border-white/[0.06]",
                            cellColumnClass(cell.column.id, cell.column.columnDef.meta?.align),
                            alignClass(cell.column.columnDef.meta?.align),
                            cell.column.id === "_serial" || cell.column.columnDef.meta?.align === "right"
                              ? "tabular-nums"
                              : null,
                            cell.column.columnDef.meta?.cellClassName,
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      <CardFooter
        className={cn(
          "flex flex-col gap-4 border-t border-gray-100 bg-transparent py-4 sm:flex-row sm:items-center",
          "dark:border-white/[0.06]",
          embedded ? "mt-4 px-0" : "px-6",
        )}
      >
        <p className="text-sm font-semibold text-foreground tabular-nums sm:flex-1 sm:text-left">
          Page {start} to {end} of {totalRows} entries
          {hasActiveSearch && rawRowCount !== totalRows ? (
            <span className="font-normal text-muted-foreground"> (filtered from {rawRowCount})</span>
          ) : null}
        </p>

        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-semibold text-foreground whitespace-nowrap">Rows</span>
          <AnimatedSelect
            ariaLabel="Rows per page"
            className={cn(
              resolvedPageSizeOptions.some((size) => size >= 100)
                ? "w-[88px]"
                : resolvedPageSizeOptions.some((size) => size >= 25)
                  ? "w-[80px]"
                  : "w-[72px]",
            )}
            value={String(pageSize)}
            onChange={(value) => {
              table.setPageSize(Number(value));
              table.setPageIndex(0);
            }}
            options={resolvedPageSizeOptions.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
          />
        </div>

        <div className="flex items-center justify-center gap-1 sm:flex-1 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft className="size-4" />
          </Button>

          {pageRange.map((page, index) =>
            page === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="px-1 text-sm text-muted-foreground select-none"
              >
                …
              </span>
            ) : (
              <Button
                key={page}
                type="button"
                variant={page === pageIndex + 1 ? "outline" : "ghost"}
                size="sm"
                className={cn(
                  "min-w-8 px-2 tabular-nums",
                  page === pageIndex + 1 && "border-foreground/20 bg-background font-semibold",
                )}
                onClick={() => table.setPageIndex(page - 1)}
              >
                {page}
              </Button>
            ),
          )}

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardFooter>
    </>
  );

  if (embedded) {
    return <div className={cn("w-full", className)}>{tableMarkup}</div>;
  }

  return <Card className={cn("w-full gap-0 py-0 ring-0", className)}>{tableMarkup}</Card>;
}
