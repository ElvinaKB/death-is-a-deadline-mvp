export interface ApiError {
  message: string;
  statusCode?: number;
  code?: string;
  errors?: Record<string, string[]>;
  /** Structured details from the API's CustomError (e.g. a wholesale price reveal). */
  data?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface TableColumn<T = unknown> {
  header: string;
  field: keyof T | string;
  render?: (row: T, rowIndex: number) => React.ReactNode;
  sortable?: boolean;
}

export interface TableProps<T = object> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
  };
  emptyMessage?: string;
}
