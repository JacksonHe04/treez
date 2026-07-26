"use client";

import { Check, LoaderCircle, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { treezLoginPath } from "@/lib/auth/paths";
import {
  domainById,
  domains,
  type Domain,
  type EntityKind,
} from "@/lib/treez/config";
import type { EntitySummary } from "@/lib/treez/types";

type SelectedRelation = Pick<EntitySummary, "id" | "name" | "kind">;
const DRAFT_KEY = "treez:add-entity-draft";

export function AddEntityForm({
  initialDomain = "music",
  initialKind,
  initialName = "",
  viewer,
}: {
  initialDomain?: Domain;
  initialKind?: EntityKind;
  initialName?: string;
  viewer: boolean;
}) {
  const router = useRouter();
  const [domain, setDomain] = useState<Domain>(initialDomain);
  const domainConfig = domainById[domain];
  const [kind, setKind] = useState<EntityKind>(
    initialKind && domainConfig.kinds.some((item) => item.id === initialKind)
      ? initialKind
      : domainConfig.kinds[0].id,
  );
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [relationQuery, setRelationQuery] = useState("");
  const [relationResults, setRelationResults] = useState<EntitySummary[]>([]);
  const [relations, setRelations] = useState<SelectedRelation[]>([]);
  const [searching, setSearching] = useState(false);
  const [relationSearchDone, setRelationSearchDone] = useState(false);
  const [creatingRelation, setCreatingRelation] = useState(false);
  const [relationKind, setRelationKind] = useState<EntityKind>(
    kind === "song"
      ? "artist"
      : (domainConfig.kinds.find((item) =>
          ["artist", "director", "author", "studio"].includes(item.id),
        )?.id ?? domainConfig.kinds[0].id),
  );
  const [pending, setPending] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  const allowedRelatedKinds = useMemo(() => {
    if (kind === "song") return ["artist", "album"];
    if (["album", "film", "book", "game"].includes(kind)) {
      return domainConfig.kinds
        .filter((item) =>
          ["artist", "director", "author", "studio"].includes(item.id),
        )
        .map((item) => item.id);
    }
    return [];
  }, [domainConfig.kinds, kind]);

  useEffect(() => {
    let saved:
      | {
          domain: Domain;
          kind: EntityKind;
          name: string;
          description: string;
          releaseDate: string;
          relations: SelectedRelation[];
        }
      | undefined;
    try {
      const stored = window.sessionStorage.getItem(DRAFT_KEY);
      if (stored) {
        const draft = JSON.parse(stored) as {
          domain?: Domain;
          kind?: EntityKind;
          name?: string;
          description?: string;
          releaseDate?: string;
          relations?: SelectedRelation[];
        };
        const nextDomain = domains.some((item) => item.id === draft.domain)
          ? (draft.domain as Domain)
          : initialDomain;
        const nextKind = domainById[nextDomain].kinds.some(
          (item) => item.id === draft.kind,
        )
          ? (draft.kind as EntityKind)
          : domainById[nextDomain].kinds[0].id;
        saved = {
          domain: nextDomain,
          kind: nextKind,
          name: initialName.trim() || draft.name || "",
          description: draft.description ?? "",
          releaseDate: draft.releaseDate ?? "",
          relations: Array.isArray(draft.relations) ? draft.relations : [],
        };
      }
    } catch {
      window.sessionStorage.removeItem(DRAFT_KEY);
    }
    queueMicrotask(() => {
      if (saved) {
        setDomain(saved.domain);
        setKind(saved.kind);
        setRelationKind(
          saved.kind === "song"
            ? "artist"
            : (domainById[saved.domain].kinds.find((item) =>
                ["artist", "director", "author", "studio"].includes(item.id),
              )?.id ?? saved.kind),
        );
        setName(saved.name);
        setDescription(saved.description);
        setReleaseDate(saved.releaseDate);
        setRelations(saved.relations);
      }
      setDraftReady(true);
    });
  }, [initialDomain, initialName]);

  useEffect(() => {
    if (!draftReady) return;
    window.sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        domain,
        kind,
        name,
        description,
        releaseDate,
        relations,
      }),
    );
  }, [description, domain, draftReady, kind, name, relations, releaseDate]);

  function changeDomain(value: Domain) {
    setDomain(value);
    setKind(domainById[value].kinds[0].id);
    setRelationKind(
      domainById[value].kinds.find((item) =>
        ["artist", "director", "author", "studio"].includes(item.id),
      )?.id ?? domainById[value].kinds[0].id,
    );
    setRelations([]);
    setRelationResults([]);
    setRelationSearchDone(false);
  }

  function changeKind(value: EntityKind) {
    setKind(value);
    const nextAllowed: EntityKind[] =
      value === "song"
        ? ["artist", "album"]
        : domainById[domain].kinds
            .filter((item) =>
              ["artist", "director", "author", "studio"].includes(item.id),
            )
            .map((item) => item.id);
    setRelationKind(nextAllowed[0] ?? value);
    setRelations([]);
    setRelationResults([]);
    setRelationSearchDone(false);
  }

  async function searchRelations() {
    if (!relationQuery.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(
        `/api/treez/search?${new URLSearchParams({ q: relationQuery })}`,
      );
      const payload = (await response.json()) as {
        data?: EntitySummary[];
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "关联条目搜索失败。");
      }
      setRelationResults(
        payload.data.filter(
          (entity) =>
            entity.domain === domain &&
            entity.kind === relationKind &&
            allowedRelatedKinds.includes(entity.kind),
        ),
      );
    } catch (error) {
      setRelationResults([]);
      toast.error("暂时无法搜索关联条目", {
        description: error instanceof Error ? error.message : "请稍后重试。",
      });
    } finally {
      setSearching(false);
      setRelationSearchDone(true);
    }
  }

  async function createRelatedEntity() {
    const relationName = relationQuery.trim();
    if (!relationName || !allowedRelatedKinds.includes(relationKind)) return;
    if (!viewer) {
      window.location.href = treezLoginPath(
        `/add?domain=${domain}&kind=${kind}`,
      );
      return;
    }
    setCreatingRelation(true);
    try {
      const response = await fetch("/api/treez/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          kind: relationKind,
          name: relationName,
          description: null,
          releaseDate: null,
          aliases: [],
          metadata: [],
          relations: [],
        }),
      });
      const payload = (await response.json()) as {
        data?: { id: string };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "关联条目创建失败。");
      }
      const created = {
        id: payload.data.id,
        name: relationName,
        kind: relationKind,
      };
      setRelations((current) =>
        current.some((item) => item.id === created.id)
          ? current
          : [...current, created],
      );
      setRelationResults([]);
      setRelationQuery("");
      setRelationSearchDone(false);
      toast.success("关联条目已创建并选中");
    } catch (error) {
      toast.error("暂时无法创建关联条目", {
        description: error instanceof Error ? error.message : "请稍后重试。",
      });
    } finally {
      setCreatingRelation(false);
    }
  }

  async function submitEntity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!viewer) {
      window.location.href = treezLoginPath(
        `/add?domain=${domain}&kind=${kind}`,
      );
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/treez/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          kind,
          name,
          description: description.trim() || null,
          releaseDate: releaseDate || null,
          aliases: [],
          metadata: [],
          relations: relations.map((relation, position) => ({
            entityId: relation.id,
            type:
              kind === "song" && relation.kind === "album"
                ? "track_of"
                : "created_by",
            position,
          })),
        }),
      });
      const payload = (await response.json()) as {
        data?: { id: string };
        error?: { message?: string };
      };
      if (response.status === 401) {
        window.location.href = treezLoginPath(
          `/add?domain=${domain}&kind=${kind}`,
        );
        return;
      }
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "条目创建失败。");
      }
      toast.success("公共条目已创建", {
        description: "现在可以为它留下第一条评分。",
      });
      window.sessionStorage.removeItem(DRAFT_KEY);
      router.push(`/entity/${payload.data.id}?created=1`);
    } catch (error) {
      toast.error("暂时无法创建条目", {
        description: error instanceof Error ? error.message : "请稍后重试。",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="add-entity-form" onSubmit={submitEntity}>
      {!viewer && (
        <div className="form-notice">
          你可以先填写内容；草稿会保存在当前浏览器，登录后返回这里继续。
        </div>
      )}
      <div className="form-grid">
        <div className="form-field">
          <Label htmlFor="entity-domain">领域</Label>
          <Select
            value={domain}
            onValueChange={(value) => changeDomain(value as Domain)}
          >
            <SelectTrigger id="entity-domain">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {domains.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="form-field">
          <Label htmlFor="entity-kind">类型</Label>
          <Select
            value={kind}
            onValueChange={(value) => changeKind(value as EntityKind)}
          >
            <SelectTrigger id="entity-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {domainConfig.kinds.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="form-field">
        <Label htmlFor="entity-name">名称</Label>
        <Input
          id="entity-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={240}
          placeholder="作品或创作者的正式名称"
        />
      </div>
      <div className="form-field">
        <Label htmlFor="entity-description">简介</Label>
        <Textarea
          id="entity-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={5}
          maxLength={50_000}
          placeholder="简要说明这个条目是什么；个人观点请留到评分评论中。"
        />
      </div>
      <div className="form-field form-field--narrow">
        <Label htmlFor="entity-release-date">发行 / 出版日期</Label>
        <Input
          id="entity-release-date"
          type="date"
          value={releaseDate}
          onChange={(event) => setReleaseDate(event.target.value)}
        />
      </div>

      {allowedRelatedKinds.length > 0 && (
        <fieldset className="relation-picker">
          <legend>关联创作者或所属专辑</legend>
          <p>先搜索已有公共条目；若不存在，可直接创建并自动关联。</p>
          <div className="relation-picker__search">
            <Select
              value={relationKind}
              onValueChange={(value) => setRelationKind(value as EntityKind)}
            >
              <SelectTrigger aria-label="关联条目类型">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {domainConfig.kinds
                  .filter((item) => allowedRelatedKinds.includes(item.id))
                  .map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              value={relationQuery}
              onChange={(event) => {
                setRelationQuery(event.target.value);
                setRelationSearchDone(false);
              }}
              placeholder="搜索名称"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchRelations();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={searchRelations}
              disabled={searching}
            >
              {searching ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Search aria-hidden="true" />
              )}
              搜索
            </Button>
          </div>
          {relationQuery.trim() &&
            relationSearchDone &&
            relationResults.length === 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={createRelatedEntity}
                disabled={searching || creatingRelation}
              >
                {creatingRelation && (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                )}
                创建“
                {relationQuery.trim()}”并关联
              </Button>
            )}
          {relationResults.length > 0 && (
            <div className="relation-results">
              {relationResults.map((result) => {
                const selected = relations.some(
                  (item) => item.id === result.id,
                );
                return (
                  <button
                    type="button"
                    key={result.id}
                    onClick={() =>
                      setRelations((current) =>
                        selected
                          ? current.filter((item) => item.id !== result.id)
                          : [
                              ...current,
                              {
                                id: result.id,
                                name: result.name,
                                kind: result.kind,
                              },
                            ],
                      )
                    }
                  >
                    <span>
                      {result.name}
                      <small>{result.kind}</small>
                    </span>
                    {selected && <Check aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          )}
          {relations.length > 0 && (
            <div className="selected-relations">
              {relations.map((relation) => (
                <Badge key={relation.id} variant="secondary">
                  {relation.name}
                  <button
                    type="button"
                    onClick={() =>
                      setRelations((current) =>
                        current.filter((item) => item.id !== relation.id),
                      )
                    }
                    aria-label={`移除 ${relation.name}`}
                  >
                    <X aria-hidden="true" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </fieldset>
      )}

      <div className="form-submit">
        <p>提交后，这个条目会立即公开，所有用户都可浏览并评分。</p>
        <Button type="submit" disabled={pending}>
          {pending && (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          )}
          创建公共条目
        </Button>
      </div>
    </form>
  );
}
