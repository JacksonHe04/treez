"use client";

import dayjs from "dayjs";
import { LoaderCircle, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { treezLoginPath } from "@/lib/auth/paths";
import { formatScore, formatStarScore } from "@/lib/treez/format";
import type { PublicRating } from "@/lib/treez/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setScoreMode } from "@/store/slices/preferencesSlice";

export function RatingEditor({
  entityId,
  entityName,
  viewer,
  initialRating,
}: {
  entityId: string;
  entityName: string;
  viewer: boolean;
  initialRating?: PublicRating;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const mode = useAppSelector((state) => state.preferences.scoreMode);
  const [score, setScore] = useState(initialRating?.score ?? 8);
  const [comment, setComment] = useState(initialRating?.comment ?? "");
  const [commentedAt, setCommentedAt] = useState(
    dayjs(initialRating?.commented_at).isValid()
      ? dayjs(initialRating?.commented_at).format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD"),
  );
  const [tags, setTags] = useState(
    initialRating?.tags.map((tag) => tag.name).join("，") ?? "",
  );
  const [pending, setPending] = useState(false);

  if (!viewer) {
    return (
      <div className="rating-gate">
        <p className="eyebrow">YOUR VERDICT</p>
        <h2>你会给《{entityName}》几分？</h2>
        <p>评分、评论和标签会进入你的公开鉴赏档案，并更新全站聚合分。</p>
        <Button asChild>
          <a href={treezLoginPath(`/entity/${entityId}`)}>使用 iNon SSO 登录</a>
        </Button>
      </div>
    );
  }

  const displayedScore = mode === "ten" ? score : score / 2;
  async function submitRating(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch(`/api/treez/entities/${entityId}/rating`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score,
          comment: comment.trim() || null,
          commentedAt,
          tags: tags
            .split(/[，,]/)
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      if (response.status === 401) {
        window.location.href = treezLoginPath(`/entity/${entityId}`);
        return;
      }
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "评分提交失败。");
      }
      toast.success(initialRating ? "鉴赏记录已更新" : "鉴赏记录已公开", {
        description: "条目聚合分和你的公开档案已经同步。",
      });
      router.refresh();
    } catch (error) {
      toast.error("暂时无法保存评分", {
        description: error instanceof Error ? error.message : "请稍后重试。",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="rating-editor" onSubmit={submitRating}>
      <div className="rating-editor__heading">
        <div>
          <p className="eyebrow">YOUR VERDICT</p>
          <h2>{initialRating ? "更新我的鉴赏" : "留下我的鉴赏"}</h2>
        </div>
        <Tabs
          value={mode}
          onValueChange={(value) =>
            dispatch(setScoreMode(value as "ten" | "stars"))
          }
        >
          <TabsList>
            <TabsTrigger value="ten">十分制</TabsTrigger>
            <TabsTrigger value="stars">五星制</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="rating-editor__score">
        <span>
          {mode === "stars" && <Star aria-hidden="true" fill="currentColor" />}
          <strong>
            {mode === "ten"
              ? formatScore(displayedScore)
              : formatStarScore(displayedScore)}
          </strong>
          <small>/ {mode === "ten" ? "10" : "5"}</small>
        </span>
        <Slider
          value={[displayedScore]}
          min={mode === "ten" ? 0 : 0}
          max={mode === "ten" ? 10 : 5}
          step={0.5}
          onValueChange={([value]) =>
            setScore(mode === "ten" ? value : value * 2)
          }
          aria-label="评分"
        />
      </div>
      <div className="form-field">
        <Label htmlFor="rating-comment">评论</Label>
        <Textarea
          id="rating-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="它为何打动你，或为何没有？"
          rows={5}
          maxLength={20_000}
        />
      </div>
      <div className="rating-editor__row">
        <div className="form-field">
          <Label htmlFor="rating-date">评论日期</Label>
          <Input
            id="rating-date"
            type="date"
            value={commentedAt}
            onChange={(event) => setCommentedAt(event.target.value)}
          />
          <small>评分提交时间由服务器记录，不能修改。</small>
        </div>
        <div className="form-field">
          <Label htmlFor="rating-tags">标签</Label>
          <Input
            id="rating-tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="夜晚，后摇，反复聆听"
          />
          <small>使用逗号分隔，最多 20 个。</small>
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending && (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        )}
        {initialRating ? "保存更新" : "公开这条鉴赏"}
      </Button>
    </form>
  );
}
