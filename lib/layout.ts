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
    if (item.type === "event") {
      const { top, height } = scale.span(item.startYear, end)
      const showLabel = top - lastLabelTop >= LABEL_GAP_PX
      if (showLabel) lastLabelTop = top
      markers.push({
        item,
        top,
        height: end > item.startYear ? height : 0,
        showLabel,
      })
      continue
    }
    const s = toAstronomical(item.startYearMin ?? item.startYear)
    let column = columnEnds.findIndex((e) => e < s)
    if (column === -1) column = columnEnds.length
    columnEnds[column] = toAstronomical(item.endYearMax ?? end)
    const span = scale.span(item.startYear, end)
    const uncertain = scale.span(
      item.startYearMin ?? item.startYear,
      item.endYearMax ?? end
    )
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
