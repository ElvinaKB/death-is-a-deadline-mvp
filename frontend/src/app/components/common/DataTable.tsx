import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SkeletonLoader } from "./SkeletonLoader";
import { TableProps } from "../../../types/api.types";

export function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  pagination,
  emptyMessage = "No data available",
}: TableProps<T>) {
  if (loading) {
    return <SkeletonLoader type="table" count={5} />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 border border-line rounded-lg glass">
        <p className="text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-line rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-line bg-glass hover:bg-glass">
              {columns.map((column, idx) => (
                <TableHead key={idx} className="text-muted font-medium">
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIdx) => (
              <TableRow key={rowIdx} className="border-line hover:bg-glass/50">
                {columns.map((column, colIdx) => (
                  <TableCell key={colIdx} className="text-fg">
                    {column.render
                      ? column.render(row)
                      : String(row[column.field as keyof T] || "-")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted">
            Page {pagination.currentPage} of {pagination.totalPages} • Total:{" "}
            {pagination.totalItems} items
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-line text-fg hover:bg-glass"
              onClick={() =>
                pagination.onPageChange(pagination.currentPage - 1)
              }
              disabled={pagination.currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-line text-fg hover:bg-glass"
              onClick={() =>
                pagination.onPageChange(pagination.currentPage + 1)
              }
              disabled={pagination.currentPage === pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
