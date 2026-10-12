export const NARRATIVE_FIELDS = [
  "expression",
  "languages",
  "community",
  "languagePractice",
  "origin",
  "meaning",
  "example",
  "feeling",
  "context",
  "intention",
  "rephrasing",
  "change",
  "identity",
  "withheld",
  "listenerPractice",
  "attribution",
] as const;

export type NarrativeField = (typeof NARRATIVE_FIELDS)[number];

export const LAYERS = ["emotion", "context", "intention", "media"] as const;
export type Layer = (typeof LAYERS)[number];

export const KINDS = ["established", "personal", "listener"] as const;
export type Kind = (typeof KINDS)[number];

export type Consent = {
  classWritten: boolean;
  publicWritten: boolean;
  classRecording: boolean;
  publicRecording: boolean;
  informOnly: boolean;
};

export type MediaItem = {
  id: string;
  name: string;
  mime: string;
  data: string;
  caption: string;
  tags: string[];
};

export type Relation = {
  target: string;
  reason: string;
  source: string;
};

export type Account = {
  id: string;
  createdAt: string;
  updatedAt: string;
  source: string;
  codingSource: string;
  kind: Kind;
  typeReviewed: boolean;
  displayConsent: boolean;
  consent: Consent;
  attribution: string;
  expression: string;
  languages: string;
  community: string;
  languagePractice: string;
  origin: string;
  meaning: string;
  example: string;
  feeling: string;
  context: string;
  intention: string;
  rephrasing: string;
  change: string;
  identity: string;
  withheld: string;
  listenerPractice: string;
  tags: Record<Exclude<Layer, "media">, string[]>;
  media: MediaItem[];
  relations: Relation[];
};

export type Edge = {
  source: string;
  target: string;
  layer: string;
  shared: string[];
  basis: string;
};

export type WordGroup = {
  key: string;
  expression: string;
  languages: string;
  community: string;
  accounts: Account[];
};
