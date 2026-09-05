export type PaneState = "loading" | "error" | "not_loaded" | "partial" | "loaded";

export interface PaneStateInput {
  status?: string;
  records?: unknown[];
  error?: boolean;
  loading?: boolean;
}

export const paneState = ({ status, records, error, loading }: PaneStateInput): PaneState => {
  if (error) {
    return "error";
  }
  if (loading || status === "loading" || records === undefined) {
    return "loading";
  }
  if (status === "partial") {
    return "partial";
  }
  if (status === "loaded") {
    return "loaded";
  }
  return "not_loaded";
};
