import Link from "next/link"
import { FC } from "react"
import {
  genreOf,
  HistoryItem,
  ITEM_BY_ID,
  PRECISION_LABEL,
  regionName,
  TYPE_LABEL,
} from "@/lib/data"
import { formatYear } from "@/lib/years"

/** 推定幅。片側のみ指定時はもう片側を代表値とする */
const range = (rep: number, min?: number, max?: number) =>
  `推定幅 ${formatYear(min ?? rep)}〜${formatYear(max ?? rep)}`

export const itemYears = (it: HistoryItem) =>
  it.endYear !== undefined && it.endYear !== it.startYear
    ? `${formatYear(it.startYear)}〜${formatYear(it.endYear)}`
    : formatYear(it.startYear)

export const ItemDetail: FC<{
  item: HistoryItem
  /** 指定時は関連項目をボタン化 (年表内移動)。未指定ならページリンク */
  onSelect?: (id: string) => void
  headingLevel?: 1 | 2
}> = ({ item, onSelect, headingLevel = 2 }) => {
  const H = headingLevel === 1 ? "h1" : "h2"
  const related = item.relatedIds.flatMap((id) => ITEM_BY_ID.get(id) ?? [])
  const approx = item.datePrecision !== "exact"
  return (
    <article style={{ display: "grid", gap: ".75rem", lineHeight: 1.6 }}>
      <header>
        <H style={{ fontSize: headingLevel === 1 ? "1.6rem" : "1.2rem" }}>
          {item.name}
        </H>
        {item.nameEn && (
          <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>
            {item.nameEn}
          </p>
        )}
      </header>
      {!item.reviewed && (
        <p
          role="note"
          style={{
            background: "#fff6dc",
            border: "1px solid #e2c56b",
            fontSize: ".8rem",
            padding: ".4rem .6rem",
          }}
        >
          サンプルデータ：出典との照合が未完了です。確定情報として扱わないでください。
        </p>
      )}
      <dl
        style={{
          display: "grid",
          gap: ".25rem .75rem",
          gridTemplateColumns: "auto 1fr",
          fontSize: ".9rem",
        }}
      >
        <dt>年代</dt>
        <dd>
          {itemYears(item)}
          {approx && <strong>（{PRECISION_LABEL[item.datePrecision]}）</strong>}
          {(item.startYearMin ?? item.startYearMax) !== undefined && (
            <div style={{ fontSize: ".8rem" }}>
              開始の
              {range(item.startYear, item.startYearMin, item.startYearMax)}
            </div>
          )}
          {(item.endYearMin ?? item.endYearMax) !== undefined && (
            <div style={{ fontSize: ".8rem" }}>
              終了の
              {range(
                item.endYear ?? item.startYear,
                item.endYearMin,
                item.endYearMax
              )}
            </div>
          )}
        </dd>
        <dt>年代の確度</dt>
        <dd>{PRECISION_LABEL[item.datePrecision]}</dd>
        <dt>種別</dt>
        <dd>{TYPE_LABEL[item.type]}</dd>
        <dt>地域</dt>
        <dd>{item.regions.map(regionName).join("、")}</dd>
        <dt>ジャンル</dt>
        <dd>
          {item.genres.map((g) => {
            const genre = genreOf(g)!
            return (
              <span
                key={g}
                style={{ color: genre.color, marginRight: ".6rem" }}
              >
                <span aria-hidden="true">{genre.symbol}</span> {genre.name}
              </span>
            )
          })}
        </dd>
      </dl>
      <p>{item.summary}</p>
      {related.length > 0 && (
        <section>
          <h3 style={{ fontSize: ".9rem" }}>関連項目</h3>
          <ul
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: ".25rem .75rem",
              listStyle: "none",
              padding: 0,
            }}
          >
            {related.map((r) => (
              <li key={r.id}>
                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(r.id)}
                    style={{
                      background: "none",
                      border: 0,
                      color: "var(--accent)",
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                    }}
                  >
                    {r.name}
                  </button>
                ) : (
                  <Link href={`/items/${r.id}/`}>{r.name}</Link>
                )}
                <span style={{ color: "var(--muted)", fontSize: ".75rem" }}>
                  {" "}
                  {itemYears(r)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h3 style={{ fontSize: ".9rem" }}>出典・参考</h3>
        <ul style={{ fontSize: ".85rem", paddingLeft: "1.2rem" }}>
          {item.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}
