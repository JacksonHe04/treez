"use client";

import { Check, LoaderCircle, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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

export function AddEntityForm({
  initialDomain = "music",
  initialKind,
  viewer,
}: {
  initialDomain?: Domain;
  initialKind?: EntityKind;
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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [relationQuery, setRelationQuery] = useState("");
  const [relationResults, setRelationResults] = useState<EntitySummary[]>([]);
  const [relations, setRelations] = useState<SelectedRelation[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, setPending] = useState(false);

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

  function changeDomain(value: Domain) {
    setDomain(value);
    setKind(domainById[value].kinds[0].id);
    setRelations([]);
    setRelationResults([]);
  }

  async function searchRelations() {
    if (!relationQuery.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(
        `/api/treez/search?${new URLSearchParams({ q: relationQuery })}`,
      );
      const payload = (await response.json()) as { data: EntitySummary[] };
      setRelationResults(
        payload.data.filter(
          (entity) =>
            entity.domain === domain &&
            allowedRelatedKinds.includes(entity.kind),
        ),
      );
    } finally {
      setSearching(false);
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
          你可以先填写内容；提交时将通过 iNon SSO 登录，并返回这里继续。
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
            onValueChange={(value) => setKind(value as EntityKind)}
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
          <p>先搜索已有公共条目；若不存在，可以稍后分别新增并补充关系。</p>
          <div className="relation-picker__search">
            <Input
              value={relationQuery}
              onChange={(event) => setRelationQuery(event.target.value)}
              placeholder="搜索名称"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchRelations();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={searchRelations}>
              {searching ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Search aria-hidden="true" />
              )}
              搜索
            </Button>
          </div>
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
