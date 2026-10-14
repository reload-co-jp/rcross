import { GENRES, HistoryItem, REGIONS } from "./data"
import { ViewState } from "./urlState"

export type LaneDef = {
  key: string
  name: string
  symbol?: string
  color?: string
  match: (it: HistoryItem) => boolean
}

const regionLane = (id: string): LaneDef | null => {
  const r = REGIONS.find((x) => x.id === id)
  return r
    ? { key: `r:${id}`, name: r.name, match: (it) => it.regions.includes(r.id) }
    : null
}

const genreLane = (id: string): LaneDef | null => {
  const g = GENRES.find((x) => x.id === id)
  return g
    ? {
        key: `g:${id}`,
        name: g.name,
        symbol: g.symbol,
        color: g.color,
        match: (it) => it.genres.includes(g.id),
      }
    : null
}

/** 表示モードに応じたレーン一覧。比較モードは地域・ジャンルを混在して任意の順に並べる */
export const laneDefs = (v: ViewState): LaneDef[] => {
  if (v.lane === "region")
    return REGIONS.filter((r) => v.regions.includes(r.id)).map((r) =>
      regionLane(r.id)!
    )
  if (v.lane === "genre")
    return GENRES.filter((g) => v.genres.includes(g.id)).map((g) =>
      genreLane(g.id)!
    )
  return v.compare.flatMap((k) => {
    const [kind, id] = k.split(":")
    return (kind === "r" ? regionLane(id) : genreLane(id)) ?? []
  })
}
