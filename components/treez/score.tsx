"use client";

import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleScoreMode } from "@/store/slices/preferencesSlice";
import { cn } from "@/lib/utils";
import { formatScore } from "@/lib/treez/format";

export function ScoreValue({
  value,
  compact = false,
  className,
}: {
  value: number | null | undefined;
  compact?: boolean;
  className?: string;
}) {
  const mode = useAppSelector((state) => state.preferences.scoreMode);
  if (value === null || value === undefined) {
    return (
      <span className={cn("score-value score-value--empty", className)}>
        未评分
      </span>
    );
  }

  return (
    <span
      className={cn(
        "score-value",
        compact && "score-value--compact",
        className,
      )}
    >
      {mode === "ten" ? (
        <>
          <strong>{formatScore(value)}</strong>
          <small>/ 10</small>
        </>
      ) : (
        <>
          <Star aria-hidden="true" fill="currentColor" />
          <strong>{formatScore(value / 2)}</strong>
          <small>/ 5</small>
        </>
      )}
    </span>
  );
}

export function ScoreModeToggle() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((state) => state.preferences.scoreMode);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => dispatch(toggleScoreMode())}
      aria-label="切换评分显示方式"
    >
      {mode === "ten" ? "切换五星制" : "切换十分制"}
    </Button>
  );
}
