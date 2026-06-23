/** Common shape for offset-based paginated APIs */
export type PagedResponse<TItem> = {
  values: TItem[];
  isLastPage: boolean;
  nextPageStart?: number;
  size: number;
  limit: number;
  start: number;
};
