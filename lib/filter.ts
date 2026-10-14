import { HistoryItem, itemEnd } from "./data"

export type Filter = {
  from: number
  to: number
  regions: string[]
  genres: string[]
}

/** 年代範囲と重なり、選択地域・ジャンルのいずれかに属する項目 */
export const filterItems = (items: HistoryItem[], f: Filter): HistoryItem[] => {
  const regions = new Set(f.regions)
  const genres = new Set(f.genres)
  return items.filter(
    (it) =>
      it.startYear <= f.to &&
      itemEnd(it) >= f.from &&
      it.regions.some((r) => regions.has(r)) &&
      it.genres.some((g) => genres.has(g))
  )
}

const norm = (s: string) => s.normalize("NFKC").toLowerCase()

/** 名称・英語名・別名・概要を対象に検索。名称一致を上位に */
export const searchItems = (
  items: HistoryItem[],
  query: string
): HistoryItem[] => {
  const q = norm(query.trim())
  if (!q) return []
  const score = (it: HistoryItem) => {
    const names = [it.name, it.nameEn ?? "", ...(it.aliases ?? [])].map(norm)
    if (names.some((n) => n === q)) return 3
    if (names.some((n) => n.includes(q))) return 2
    return norm(it.summary).includes(q) ? 1 : 0
  }
  return items
    .map((it) => ({ it, s: score(it) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.it.startYear - b.it.startYear)
    .map((x) => x.it)
}
