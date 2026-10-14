import { GENRES, REGIONS } from "./data"
import { isValidYear } from "./years"

export type LaneMode = "region" | "genre" | "compare"

export type ViewState = {
  from: number
  to: number
  pxPerYear: number
  regions: string[]
  genres: string[]
  lane: LaneMode
  /** 比較モードで並べるレーン ("r:地域ID" / "g:ジャンルID")。順序を保持 */
  compare: string[]
  selected: string | null
}

export const MIN_YEAR = -3500
export const MAX_YEAR = 2000
export const MIN_ZOOM = 0.05
export const MAX_ZOOM = 20

export const DEFAULT_VIEW: ViewState = {
  from: MIN_YEAR,
  to: MAX_YEAR,
  pxPerYear: 0.4,
  regions: REGIONS.map((r) => r.id),
  genres: GENRES.map((g) => g.id),
  lane: "region",
  compare: ["r:east-asia", "r:europe", "g:science"],
  selected: null,
}

const isLaneKey = (k: string) => {
  const [kind, id] = k.split(":")
  return (kind === "r" ? REGIONS : kind === "g" ? GENRES : []).some(
    (x) => x.id === id
  )
}

const list = (v: string | null, allowed: readonly { id: string }[]) =>
  v === null
    ? null
    : v.split(",").filter((id) => allowed.some((a) => a.id === id))

/** URL クエリ → 表示状態。不正値は既定値に戻す */
export const parseView = (search: string): ViewState => {
  const p = new URLSearchParams(search)
  const year = (k: string, d: number) => {
    const n = Number(p.get(k))
    return p.has(k) && isValidYear(n) ? n : d
  }
  const from = year("from", DEFAULT_VIEW.from)
  const to = year("to", DEFAULT_VIEW.to)
  const z = Number(p.get("z"))
  return {
    from: Math.min(from, to),
    to: Math.max(from, to),
    pxPerYear: z >= MIN_ZOOM && z <= MAX_ZOOM ? z : DEFAULT_VIEW.pxPerYear,
    regions: list(p.get("r"), REGIONS) ?? DEFAULT_VIEW.regions,
    genres: list(p.get("g"), GENRES) ?? DEFAULT_VIEW.genres,
    lane:
      (["genre", "compare"] as const).find((m) => m === p.get("lane")) ??
      "region",
    compare: p.has("c")
      ? [...new Set(p.get("c")!.split(",").filter(isLaneKey))]
      : DEFAULT_VIEW.compare,
    selected: p.get("sel"),
  }
}

/** 既定値と同じ項目は省略して短いURLにする */
export const serializeView = (v: ViewState): string => {
  const p = new URLSearchParams()
  const d = DEFAULT_VIEW
  if (v.from !== d.from) p.set("from", String(v.from))
  if (v.to !== d.to) p.set("to", String(v.to))
  if (v.pxPerYear !== d.pxPerYear) p.set("z", String(+v.pxPerYear.toFixed(3)))
  if (v.regions.length !== d.regions.length) p.set("r", v.regions.join(","))
  if (v.genres.length !== d.genres.length) p.set("g", v.genres.join(","))
  if (v.lane !== d.lane) p.set("lane", v.lane)
  if (v.compare.join() !== d.compare.join()) p.set("c", v.compare.join(","))
  if (v.selected) p.set("sel", v.selected)
  const s = p.toString()
  return s ? `?${s}` : ""
}
