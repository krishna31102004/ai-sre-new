export function relativeTime(value: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

export function percent(value: number | null): string {
  return value === null ? "--" : `${Math.round(value * 100)}%`;
}

export function number(value: number | null): string {
  return value === null ? "--" : new Intl.NumberFormat().format(value);
}

export function truncate(value: string | null, length: number): string {
  if (!value) return "--";
  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}
