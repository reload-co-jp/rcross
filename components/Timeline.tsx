"use client"

import Link from "next/link"
import {
  CSSProperties,
  FC,
  FormEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  genreOf,
  GENRES,
  HistoryItem,
  ITEM_BY_ID,
  ITEMS,
  itemEnd,
  REGIONS,
  TYPE_LABEL,
  PRECISION_LABEL,
} from "@/lib/data"
import { filterItems, searchItems } from "@/lib/filter"
import { layoutLane } from "@/lib/layout"
import { createScale, ticks, tickStep } from "@/lib/scale"
import {
  DEFAULT_VIEW,
  MAX_YEAR,
  MAX_ZOOM,
  MIN_YEAR,
  MIN_ZOOM,
  parseView,
  serializeView,
  ViewState,
} from "@/lib/urlState"
import {
  Era,
  formatYear,
  fromEraInput,
  toAstronomical,
  toEraInput,
} from "@/lib/years"
import { ItemDetail, itemYears } from "./ItemDetail"
import s from "./timeline.module.css"

const AXIS_W = 72
const HEADER_H = 36
const COL_W = 18
const EVENT_W = 140
const LANE_MIN_W = 170

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
const color = (it: HistoryItem) => genreOf(it.genres[0])!.color
const label = (it: HistoryItem) =>
  `${it.name}、${itemYears(it)}（${PRECISION_LABEL[it.datePrecision]}）、${TYPE_LABEL[it.type]}`

export const Timeline: FC = () => {
  const [view, setView] = useState<ViewState>(DEFAULT_VIEW)
  const [ready, setReady] = useState(false)
  const [query, setQuery] = useState("")
  const scrollerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef(view)
  // ズーム時に保つ位置 (天文年の小数, ビューポート内のpx) / 選択時にスクロールする項目
  const anchorRef = useRef<{ a: number; px: number } | null>(null)
  const scrollToRef = useRef<string | null>(null)

  // URL → 状態 (静的エクスポートのため初回描画後に読む)
  useEffect(() => {
    const v = parseView(window.location.search)
    scrollToRef.current = v.selected
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView(v)
    setReady(true)
  }, [])

  // 状態 → URL (履歴を増やさず置換)
  useEffect(() => {
    viewRef.current = view
    if (ready)
      window.history.replaceState(
        null,
        "",
        window.location.pathname + serializeView(view)
      )
  }, [view, ready])

  const scale = useMemo(
    () => createScale(view.from, view.to, view.pxPerYear),
    [view.from, view.to, view.pxPerYear]
  )
  const visible = useMemo(() => filterItems(ITEMS, view), [view])

  const lanes = useMemo(() => {
    const defs =
      view.lane === "region"
        ? REGIONS.filter((r) => view.regions.includes(r.id))
        : GENRES.filter((g) => view.genres.includes(g.id))
    const out = []
    let x = 0
    for (const def of defs) {
      const items = visible.filter((it) =>
        view.lane === "region"
          ? it.regions.includes(def.id as never)
          : it.genres.includes(def.id as never)
      )
      const layout = layoutLane(items, scale)
      const width = Math.max(LANE_MIN_W, layout.columns * COL_W + EVENT_W)
      out.push({ def, layout, x, width })
      x += width
    }
    return out
  }, [visible, scale, view.lane, view.regions, view.genres])
  const lanesW = lanes.reduce((n, l) => n + l.width, 0)

  // 範囲型が複数レーンにまたがる場合、開始位置を結ぶ線
  const connectors = useMemo(() => {
    const xs = new Map<string, { item: HistoryItem; x: number[] }>()
    for (const lane of lanes)
      for (const b of lane.layout.bands)
        if (b.item.type === "process") {
          const e = xs.get(b.item.id) ?? { item: b.item, x: [] }
          e.x.push(lane.x + b.column * COL_W + COL_W / 2)
          xs.set(b.item.id, e)
        }
    return [...xs.values()].filter((e) => e.x.length > 1)
  }, [lanes])

  const step = tickStep(view.pxPerYear)
  const tickYears = useMemo(
    () => ticks(view.from, view.to, step),
    [view.from, view.to, step]
  )

  const zoomTo = (z: number, px?: number) => {
    const el = scrollerRef.current
    const v = viewRef.current
    const next = clampZoom(z)
    if (!el || next === v.pxPerYear) return
    const at = px ?? el.clientHeight / 2
    const a =
      toAstronomical(v.from) + (el.scrollTop + at - HEADER_H) / v.pxPerYear
    anchorRef.current = { a, px: at }
    setView({ ...v, pxPerYear: next })
  }

  const fitAll = () => {
    const el = scrollerRef.current
    if (!el) return
    const years = toAstronomical(view.to) + 1 - toAstronomical(view.from)
    setView({
      ...view,
      pxPerYear: clampZoom((el.clientHeight - HEADER_H - 8) / years),
    })
  }

  // ズーム後にアンカー位置を維持 / 選択項目へスクロール
  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    if (anchorRef.current) {
      const { a, px } = anchorRef.current
      el.scrollTop =
        (a - toAstronomical(view.from)) * view.pxPerYear + HEADER_H - px
      anchorRef.current = null
    }
    const id = scrollToRef.current
    const item = id && ITEM_BY_ID.get(id)
    if (item) {
      scrollToRef.current = null
      const lane = lanes.find((l) =>
        view.lane === "region"
          ? item.regions.includes(l.def.id as never)
          : item.genres.includes(l.def.id as never)
      )
      el.scrollTo({
        top: Math.max(
          0,
          scale.top(Math.max(item.startYear, view.from)) - el.clientHeight / 3
        ),
        left: lane ? Math.max(0, lane.x - 40) : el.scrollLeft,
      })
    }
  }, [scale, lanes, view.from, view.pxPerYear, view.lane])

  // Ctrl/⌘ + ホイール (トラックパッドのピンチ含む) でズーム
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      zoomTo(
        viewRef.current.pxPerYear * Math.exp(-e.deltaY * 0.01),
        e.clientY - rect.top
      )
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  })

  /** 項目を選択し、必要ならフィルターを広げて表示範囲へ移動 */
  const select = (id: string | null) => {
    const item = id ? ITEM_BY_ID.get(id) : null
    if (!item) return setView({ ...view, selected: null })
    const regions = item.regions.some((r) => view.regions.includes(r))
      ? view.regions
      : [...view.regions, ...item.regions]
    const genres = item.genres.some((g) => view.genres.includes(g))
      ? view.genres
      : [...view.genres, ...item.genres]
    scrollToRef.current = item.id
    setView({
      ...view,
      regions,
      genres,
      from: Math.min(view.from, item.startYear),
      to: Math.max(view.to, itemEnd(item)),
      selected: item.id,
    })
  }

  const results = useMemo(() => searchItems(ITEMS, query).slice(0, 10), [query])
  const selected = view.selected ? ITEM_BY_ID.get(view.selected) : undefined

  const toggle = (key: "regions" | "genres", id: string) =>
    setView({
      ...view,
      [key]: view[key].includes(id)
        ? view[key].filter((x) => x !== id)
        : [...view[key], id],
    })

  const onRange = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const from = fromEraInput(f.get("fromEra") as Era, Number(f.get("from")))
    const to = fromEraInput(f.get("toEra") as Era, Number(f.get("to")))
    if (from === null || to === null || from > to) {
      e.currentTarget.querySelector<HTMLElement>("[data-error]")!.textContent =
        "年は1以上、開始≦終了で入力"
      return
    }
    setView({ ...view, from, to })
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "+" || e.key === "=") zoomTo(view.pxPerYear * 1.5)
    else if (e.key === "-") zoomTo(view.pxPerYear / 1.5)
    else if (e.key === "Escape") select(null)
  }

  return (
    <div className={s.app}>
      <div className={s.toolbar} role="toolbar" aria-label="表示操作">
        <div className={s.search}>
          <input
            type="search"
            placeholder="項目を検索（例：漢、ペスト）"
            aria-label="キーワード検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) {
                select(results[0].id)
                setQuery("")
              } else if (e.key === "Escape") setQuery("")
            }}
          />
          {query.trim() && (
            <ul className={s.results} aria-label="検索結果">
              {results.length === 0 && (
                <li style={{ padding: ".3rem .6rem" }}>該当なし</li>
              )}
              {results.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => {
                      select(it.id)
                      setQuery("")
                    }}
                  >
                    {it.name}
                    <small style={{ color: "var(--muted)" }}>
                      {" "}
                      {itemYears(it)}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <fieldset className={s.group} style={{ border: 0, padding: 0 }}>
          <legend style={{ float: "left", marginRight: ".35rem" }}>
            レーン
          </legend>
          {(["region", "genre"] as const).map((m) => (
            <label key={m}>
              <input
                type="radio"
                name="lane"
                checked={view.lane === m}
                onChange={() => setView({ ...view, lane: m })}
              />
              {m === "region" ? "地域別" : "ジャンル別"}
            </label>
          ))}
        </fieldset>

        <FilterDropdown
          title="地域"
          options={REGIONS}
          selected={view.regions}
          onToggle={(id) => toggle("regions", id)}
          onAll={(all) =>
            setView({ ...view, regions: all ? REGIONS.map((r) => r.id) : [] })
          }
        />
        <FilterDropdown
          title="ジャンル"
          options={GENRES}
          selected={view.genres}
          onToggle={(id) => toggle("genres", id)}
          onAll={(all) =>
            setView({ ...view, genres: all ? GENRES.map((g) => g.id) : [] })
          }
        />

        <form
          className={`${s.group} ${s.yearForm}`}
          onSubmit={onRange}
          key={`${view.from}:${view.to}`}
          aria-label="表示年代"
        >
          <YearField name="from" label="開始" value={view.from} />〜
          <YearField name="to" label="終了" value={view.to} />
          <button type="submit">適用</button>
          <button
            type="button"
            onClick={() => setView({ ...view, from: MIN_YEAR, to: MAX_YEAR })}
          >
            全期間
          </button>
          <span data-error role="alert" style={{ color: "#a33b2b" }} />
        </form>

        <div className={s.group} aria-label="ズーム">
          <button
            type="button"
            onClick={() => zoomTo(view.pxPerYear / 1.5)}
            aria-label="縮小"
          >
            −
          </button>
          <input
            type="range"
            aria-label="ズーム"
            min={Math.log2(MIN_ZOOM)}
            max={Math.log2(MAX_ZOOM)}
            step={0.05}
            value={Math.log2(view.pxPerYear)}
            onChange={(e) => zoomTo(2 ** Number(e.target.value))}
          />
          <button
            type="button"
            onClick={() => zoomTo(view.pxPerYear * 1.5)}
            aria-label="拡大"
          >
            ＋
          </button>
          <button type="button" onClick={fitAll}>
            全体表示
          </button>
          <span style={{ color: "var(--muted)" }}>目盛 {step}年</span>
        </div>
      </div>

      <p className={s.note}>
        サンプルデータ（{ITEMS.length}件・出典照合未完了）。表示中{" "}
        {visible.length} 件。項目をクリックで詳細、Ctrl/⌘+ホイールでズーム。
      </p>

      <div className={s.body}>
        {/* スクロール領域はキーボードで操作できるようフォーカス可能にする */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <div
          className={s.scroller}
          ref={scrollerRef}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          onKeyDown={onKeyDown}
          role="region"
          aria-label="年表（＋/−キーでズーム）"
        >
          <div style={{ width: AXIS_W + lanesW, minWidth: "100%" }}>
            <div className={s.headerRow}>
              <div className={s.corner} style={{ width: AXIS_W }}>
                年代
              </div>
              {lanes.map((l) => (
                <div
                  key={l.def.id}
                  className={s.laneName}
                  style={{ width: l.width }}
                  title={l.def.name}
                >
                  {"symbol" in l.def && (
                    <span aria-hidden="true" style={{ color: l.def.color }}>
                      {l.def.symbol}{" "}
                    </span>
                  )}
                  {l.def.name}
                </div>
              ))}
            </div>

            <div className={s.grid} style={{ height: scale.height }}>
              <div
                className={s.axis}
                style={{ width: AXIS_W, height: scale.height }}
                aria-hidden="true"
              >
                {tickYears.map((y) => (
                  <span
                    key={y}
                    className={`${s.tick} ${y === 1 ? s.epoch : ""}`}
                    style={{ top: scale.top(y) }}
                  >
                    {y === 1 ? "紀元1年" : formatYear(y)}
                  </span>
                ))}
              </div>

              <div
                className={s.lanes}
                style={{ width: lanesW, height: scale.height }}
              >
                {tickYears.map((y) => (
                  <div
                    key={y}
                    className={`${s.gridline} ${y === 1 ? s.epoch : ""}`}
                    style={{ top: scale.top(y) }}
                  />
                ))}
                {lanes.length === 0 && (
                  <p className={s.empty}>
                    地域またはジャンルを選択してください。
                  </p>
                )}
                {lanes.map((l) => (
                  <div
                    key={l.def.id}
                    className={s.lane}
                    style={{ left: l.x, width: l.width, height: scale.height }}
                    role="list"
                    aria-label={l.def.name}
                  >
                    {l.layout.bands.map((b) => {
                      const left = b.column * COL_W + 2
                      const isSel = b.item.id === view.selected
                      return (
                        <div role="listitem" key={b.item.id}>
                          {(b.uncertainTop < b.top ||
                            b.uncertainTop + b.uncertainHeight >
                              b.top + b.height) && (
                            <div
                              className={s.uncertain}
                              style={{
                                top: b.uncertainTop,
                                height: b.uncertainHeight,
                                left: left - 1,
                                width: COL_W - 2,
                              }}
                            />
                          )}
                          <button
                            type="button"
                            className={`${s.band} ${b.item.type === "process" ? s.process : ""} ${isSel ? s.selected : ""}`}
                            style={
                              {
                                top: b.top,
                                height: b.height,
                                left,
                                width: COL_W - 4,
                                "--c": color(b.item),
                              } as CSSProperties
                            }
                            title={`${b.item.name}（${itemYears(b.item)}）`}
                            aria-label={label(b.item)}
                            aria-pressed={isSel}
                            onClick={() => select(b.item.id)}
                          >
                            {b.height > 40 && (
                              <span className={s.bandLabel}>{b.item.name}</span>
                            )}
                          </button>
                        </div>
                      )
                    })}
                    {l.layout.markers.map((m) => {
                      const g = genreOf(m.item.genres[0])!
                      const isSel = m.item.id === view.selected
                      return (
                        <div role="listitem" key={m.item.id}>
                          <button
                            type="button"
                            className={`${s.marker} ${isSel ? s.selected : ""}`}
                            style={{
                              top: m.top + Math.min(view.pxPerYear, 16) / 2,
                              left: l.layout.columns * COL_W + 4,
                              color: g.color,
                            }}
                            title={`${m.item.name}（${itemYears(m.item)}）`}
                            aria-label={label(m.item)}
                            aria-pressed={isSel}
                            onClick={() => select(m.item.id)}
                          >
                            <span className={s.glyph} aria-hidden="true">
                              {g.symbol}
                            </span>
                            {(m.showLabel || isSel) && (
                              <span
                                className={s.markerLabel}
                                style={{ color: "var(--ink)" }}
                              >
                                {m.item.name}
                              </span>
                            )}
                            {m.height > 8 && (
                              <span
                                className={s.markerSpan}
                                style={{ height: m.height }}
                              />
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ))}
                {connectors.map(({ item, x }) => (
                  <div
                    key={item.id}
                    className={s.connector}
                    aria-hidden="true"
                    style={{
                      top: scale.top(item.startYear),
                      left: Math.min(...x),
                      width: Math.max(...x) - Math.min(...x),
                      color: color(item),
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {selected && (
          <aside className={s.panel} aria-label="項目の詳細">
            <button
              type="button"
              className={s.close}
              onClick={() => select(null)}
            >
              閉じる
            </button>
            <ItemDetail item={selected} onSelect={select} />
            <p style={{ fontSize: ".8rem", marginTop: "1rem" }}>
              <Link href={`/items/${selected.id}/`}>この項目の個別ページ</Link>
            </p>
          </aside>
        )}
      </div>
    </div>
  )
}

const FilterDropdown: FC<{
  title: string
  options: readonly {
    id: string
    name: string
    symbol?: string
    color?: string
  }[]
  selected: string[]
  onToggle: (id: string) => void
  onAll: (all: boolean) => void
}> = ({ title, options, selected, onToggle, onAll }) => (
  <details className={s.dropdown}>
    <summary>
      {title}（{selected.length}/{options.length}）
    </summary>
    <div className={s.dropdownPanel}>
      <div className={s.group}>
        <button type="button" onClick={() => onAll(true)}>
          すべて
        </button>
        <button type="button" onClick={() => onAll(false)}>
          解除
        </button>
      </div>
      {options.map((o) => (
        <label key={o.id}>
          <input
            type="checkbox"
            checked={selected.includes(o.id)}
            onChange={() => onToggle(o.id)}
          />{" "}
          {o.symbol && (
            <span aria-hidden="true" style={{ color: o.color }}>
              {o.symbol}{" "}
            </span>
          )}
          {o.name}
        </label>
      ))}
    </div>
  </details>
)

const YearField: FC<{ name: string; label: string; value: number }> = ({
  name,
  label,
  value,
}) => {
  const { era, value: n } = toEraInput(value)
  return (
    <span className={s.group}>
      <select
        name={`${name}Era`}
        defaultValue={era}
        aria-label={`${label}年代の紀元`}
      >
        <option value="BC">紀元前</option>
        <option value="AD">紀元後</option>
      </select>
      <input
        type="number"
        name={name}
        min={1}
        defaultValue={n}
        aria-label={`${label}年`}
        required
      />
    </span>
  )
}
