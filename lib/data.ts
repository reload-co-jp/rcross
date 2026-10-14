import rawItems from "@/data/items.json"
import { isValidYear } from "./years"

export const REGIONS = [
  { id: "west-asia-north-africa", name: "西アジア・北アフリカ" },
  { id: "europe", name: "ヨーロッパ" },
  { id: "sub-saharan-africa", name: "サハラ以南アフリカ" },
  { id: "south-asia", name: "南アジア" },
  { id: "east-asia", name: "東アジア" },
  { id: "southeast-asia", name: "東南アジア" },
  { id: "central-asia", name: "中央アジア" },
  { id: "north-america", name: "北アメリカ" },
  { id: "mesoamerica-caribbean", name: "中央アメリカ・カリブ海" },
  { id: "south-america", name: "南アメリカ" },
  { id: "oceania", name: "オセアニア" },
] as const

// symbol: 色に頼らずジャンルを識別するための形状
export const GENRES = [
  { id: "politics", name: "政治・国家・王朝", symbol: "■", color: "#4a5a8a" },
  { id: "war", name: "戦争・外交", symbol: "✕", color: "#a33b2b" },
  { id: "religion", name: "宗教・思想", symbol: "✦", color: "#7a4a8f" },
  { id: "science", name: "科学・技術", symbol: "▲", color: "#2f6f73" },
  { id: "economy", name: "経済・交易", symbol: "◆", color: "#8a6a1f" },
  { id: "society", name: "社会・生活", symbol: "●", color: "#5a6b3a" },
  { id: "arts", name: "芸術・文学", symbol: "♪", color: "#a0466a" },
  { id: "people", name: "人物", symbol: "☺", color: "#555555" },
  { id: "exploration", name: "地理・探検", symbol: "➤", color: "#2b6aa3" },
  { id: "environment", name: "災害・環境", symbol: "≈", color: "#8a4f2b" },
] as const

export type RegionId = (typeof REGIONS)[number]["id"]
export type GenreId = (typeof GENRES)[number]["id"]
export type ItemType = "period" | "event" | "process"
export type DatePrecision = "exact" | "approximate" | "disputed"

export const TYPE_LABEL: Record<ItemType, string> = {
  period: "期間型",
  event: "時点型",
  process: "範囲型",
}
export const PRECISION_LABEL: Record<DatePrecision, string> = {
  exact: "確定",
  approximate: "推定",
  disputed: "諸説あり",
}

export type HistoryItem = {
  id: string
  name: string
  nameEn?: string
  aliases?: string[]
  type: ItemType
  startYear: number
  endYear?: number
  startYearMin?: number
  startYearMax?: number
  endYearMin?: number
  endYearMax?: number
  datePrecision: DatePrecision
  regions: RegionId[]
  genres: GenreId[]
  summary: string
  relatedIds: string[]
  sources: { title: string; url: string }[]
  /** 出典と照合済みか。false の項目は確定情報として扱わない */
  reviewed: boolean
}

const regionIds = new Set<string>(REGIONS.map((r) => r.id))
const genreIds = new Set<string>(GENRES.map((g) => g.id))

/** データの欠落・不正IDを列挙する。空配列なら妥当 */
export const validateItems = (items: unknown[]): string[] => {
  const errors: string[] = []
  const ids = new Set<string>()
  const all = items as Partial<HistoryItem>[]
  all.forEach((it, i) => {
    const at = `items[${i}]${it?.id ? ` (${it.id})` : ""}`
    const err = (m: string) => errors.push(`${at}: ${m}`)
    if (!it || typeof it !== "object") return err("not an object")
    if (!it.id || !/^[a-z0-9-]+$/.test(it.id)) err("invalid id")
    else if (ids.has(it.id)) err("duplicate id")
    else ids.add(it.id)
    if (!it.name) err("missing name")
    if (!it.summary) err("missing summary")
    if (!["period", "event", "process"].includes(it.type as string))
      err(`invalid type: ${it.type}`)
    if (
      !["exact", "approximate", "disputed"].includes(it.datePrecision as string)
    )
      err(`invalid datePrecision: ${it.datePrecision}`)
    if (!isValidYear(it.startYear)) err(`invalid startYear: ${it.startYear}`)
    for (const k of [
      "endYear",
      "startYearMin",
      "startYearMax",
      "endYearMin",
      "endYearMax",
    ] as const)
      if (it[k] !== undefined && !isValidYear(it[k]))
        err(`invalid ${k}: ${it[k]}`)
    if (it.type !== "event" && it.endYear === undefined) err("missing endYear")
    if (it.endYear !== undefined && it.endYear < it.startYear!)
      err("endYear before startYear")
    if (it.startYearMin !== undefined && it.startYearMin > it.startYear!)
      err("startYearMin > startYear")
    if (it.startYearMax !== undefined && it.startYearMax < it.startYear!)
      err("startYearMax < startYear")
    if (
      it.endYearMin !== undefined &&
      it.endYearMin > (it.endYear ?? it.startYear!)
    )
      err("endYearMin > endYear")
    if (
      it.endYearMax !== undefined &&
      it.endYearMax < (it.endYear ?? it.startYear!)
    )
      err("endYearMax < endYear")
    if (!Array.isArray(it.regions) || it.regions.length === 0) err("no regions")
    else
      it.regions.forEach(
        (r) => !regionIds.has(r) && err(`unknown region: ${r}`)
      )
    if (!Array.isArray(it.genres) || it.genres.length === 0) err("no genres")
    else
      it.genres.forEach((g) => !genreIds.has(g) && err(`unknown genre: ${g}`))
    if (!Array.isArray(it.sources) || it.sources.length === 0) err("no sources")
    else
      it.sources.forEach(
        (s) =>
          (!s.title || !/^https?:\/\//.test(s.url)) && err("invalid source")
      )
    if (typeof it.reviewed !== "boolean") err("missing reviewed flag")
    if (!Array.isArray(it.relatedIds)) err("missing relatedIds")
  })
  // 関連IDは全件のID確定後に検査
  all.forEach((it) =>
    it?.relatedIds?.forEach(
      (r) => !ids.has(r) && errors.push(`${it.id}: unknown relatedId: ${r}`)
    )
  )
  return errors
}

const loadItems = (): HistoryItem[] => {
  const errors = validateItems(rawItems)
  if (errors.length) {
    // 開発・ビルド時に検知。本番では壊れた項目のみ除外して描画を継続
    if (process.env.NODE_ENV !== "production")
      throw new Error(`data/items.json is invalid:\n${errors.join("\n")}`)
    console.error(errors)
    const bad = new Set(errors.map((e) => e.match(/\(([^)]+)\)/)?.[1]))
    return (rawItems as HistoryItem[]).filter((it) => !bad.has(it.id))
  }
  return rawItems as HistoryItem[]
}

export const ITEMS: HistoryItem[] = loadItems()
export const ITEM_BY_ID = new Map(ITEMS.map((it) => [it.id, it]))
export const regionName = (id: string) =>
  REGIONS.find((r) => r.id === id)?.name ?? id
export const genreOf = (id: string) => GENRES.find((g) => g.id === id)

/** 項目の終了年 (時点型で endYear 省略時は開始年) */
export const itemEnd = (it: HistoryItem) => it.endYear ?? it.startYear
