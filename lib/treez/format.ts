import dayjs from "dayjs";

export function formatDate(value: string, fallback = "日期未记录"): string {
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (isoDate) return `${isoDate[1]}.${isoDate[2]}.${isoDate[3]}`;
  const date = dayjs(value);
  if (!date.isValid()) return fallback;
  const [year, month, day] = date.toISOString().slice(0, 10).split("-");
  return `${year}.${month}.${day}`;
}

export function formatScore(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : Number(value).toFixed(1);
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function validCoverUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
