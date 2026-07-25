import type { LucideIcon } from "lucide-react";
import { BookOpen, Clapperboard, Gamepad2, Music2 } from "lucide-react";

export type Domain = "music" | "film" | "book" | "game";
export type EntityKind =
  | "album"
  | "song"
  | "artist"
  | "film"
  | "director"
  | "book"
  | "author"
  | "game"
  | "studio";

export type DomainConfig = {
  id: Domain;
  href: string;
  label: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  kinds: Array<{ id: EntityKind; label: string }>;
};

export const domains: DomainConfig[] = [
  {
    id: "music",
    href: "/music",
    label: "音乐",
    eyebrow: "LISTENING",
    description: "专辑、单曲与艺术家",
    icon: Music2,
    kinds: [
      { id: "album", label: "专辑" },
      { id: "song", label: "单曲" },
      { id: "artist", label: "艺术家" },
    ],
  },
  {
    id: "film",
    href: "/film",
    label: "影视",
    eyebrow: "WATCHING",
    description: "影视作品与导演",
    icon: Clapperboard,
    kinds: [
      { id: "film", label: "作品" },
      { id: "director", label: "导演" },
    ],
  },
  {
    id: "book",
    href: "/books",
    label: "书",
    eyebrow: "READING",
    description: "书籍作品与作者",
    icon: BookOpen,
    kinds: [
      { id: "book", label: "作品" },
      { id: "author", label: "作者" },
    ],
  },
  {
    id: "game",
    href: "/games",
    label: "游戏",
    eyebrow: "PLAYING",
    description: "游戏作品与工作室",
    icon: Gamepad2,
    kinds: [
      { id: "game", label: "作品" },
      { id: "studio", label: "工作室" },
    ],
  },
];

export const domainById = Object.fromEntries(
  domains.map((domain) => [domain.id, domain]),
) as Record<Domain, DomainConfig>;

export const kindLabels = Object.fromEntries(
  domains.flatMap((domain) =>
    domain.kinds.map((kind) => [kind.id, kind.label]),
  ),
) as Record<EntityKind, string>;
