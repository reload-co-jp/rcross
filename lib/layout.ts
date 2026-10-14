import { HistoryItem, itemEnd } from "./data"
import { Scale } from "./scale"
import { toAstronomical } from "./years"

export type BandBox = {
  item: HistoryItem
  column: number
  top: number
  height: number
  /** 不確実性 (min〜max) の範囲。代表値の帯とは別に薄く描く */
  uncertainTop: number
  uncertainHeight: number
}

export type MarkerBox = {
  item: HistoryItem
  top: number
  /** 時点型が期間を持つ場合の長さ (0 なら点) */
  height: number
  showLabel: boolean
  /** 推定幅 (min〜max)。幅が指定されていなければ null */
  uncertain: { top: number; height: number } | null
}

export type LaneLayout = {
  bands: BandBox[]
  markers: MarkerBox[]
  columns: number
}

const MIN_BAND_PX = 4
const LABEL_GAP_PX = 16

/** 1レーン内の配置。帯は重ならない列に詰め、マーカーは近接するラベルを省略 */
export const layoutLane = (items: HistoryItem[], scale: Scale): LaneLayout => {
  const byStart = [...items].sort(
    (a, b) => a.startYear - b.startYear || itemEnd(b) - itemEnd(a)
  )
  const columnEnds: number[] = [] // 各列の最後の帯の終了 (天文年)
  const bands: BandBox[] = []
  const markers: MarkerBox[] = []
  let lastLabelTop = -Infinity

  for (const item of byStart) {
    const end = itemEnd(item)
    // 推定幅: 最も早い開始〜最も遅い終了 (startYearMax のみの時点型も含む)
    const uncertain = scale.span(
      item.startYearMin ?? item.startYear,
      Math.max(end, item.endYearMax ?? end, item.startYearMax ?? end)
    )
    const hasRange = [
      item.startYearMin,
      item.startYearMax,
      item.endYearMin,
      item.endYearMax,
    ].some((y) => y !== undefined)
    if (item.type === "event") {
      const { top, height } = scale.span(item.startYear, end)
      const showLabel = top - lastLabelTop >= LABEL_GAP_PX
      if (showLabel) lastLabelTop = top
      markers.push({
        item,
        top,
        height: end > item.startYear ? height : 0,
        showLabel,
        uncertain: hasRange ? uncertain : null,
      })
      continue
    }
    const s = toAstronomical(item.startYearMin ?? item.startYear)
    let column = columnEnds.findIndex((e) => e < s)
    if (column === -1) column = columnEnds.length
    columnEnds[column] = toAstronomical(item.endYearMax ?? end)
    const span = scale.span(item.startYear, end)
    bands.push({
      item,
      column,
      top: span.top,
      height: Math.max(span.height, MIN_BAND_PX),
      uncertainTop: uncertain.top,
      uncertainHeight: uncertain.height,
    })
  }
  return { bands, markers, columns: columnEnds.length }
}
