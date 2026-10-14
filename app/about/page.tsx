import Link from "next/link"
import { Footer, Main } from "@/components/elements/layout"
import { GENRES } from "@/lib/data"

export const metadata = { title: "使い方・データ方針" }

const section = {
  display: "grid",
  gap: ".5rem",
  marginBottom: "1.5rem",
  lineHeight: 1.7,
}

const AboutPage = () => (
  <>
    <Main>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
        使い方・データ方針
      </h1>
      <section style={section}>
        <h2 style={{ fontSize: "1.1rem" }}>このサービスについて</h2>
        <p>
          世界史クロスビューは、地域やジャンルの異なる歴史を同じ縦の時間軸に並べ、同時代に世界の各地で何が起きていたかを比較するための年表です。
        </p>
      </section>
      <section style={section}>
        <h2 style={{ fontSize: "1.1rem" }}>使い方</h2>
        <ul style={{ paddingLeft: "1.2rem" }}>
          <li>
            上が古く、下が新しい年代です。縮尺は線形で、紀元前1年の次は紀元1年です（年0はありません）。
          </li>
          <li>
            帯は王朝・国家などの期間（期間型）、斜線の帯は伝播・交易など地域をまたぐ過程（範囲型）、記号は戦争・発明などの出来事（時点型）です。
          </li>
          <li>帯の周囲の点線枠は、開始・終了年代の推定幅を示します。</li>
          <li>
            ＋／−ボタン、スライダー、Ctrl（⌘）＋ホイールでズームできます。年表にフォーカスして＋／−キーでも操作できます。
          </li>
          <li>
            地域・ジャンル・年代で絞り込めます。表示状態はURLに保存され、そのまま共有できます。
          </li>
          <li>
            項目を選ぶと詳細・関連項目・出典が表示されます。Escキーで閉じます。
          </li>
        </ul>
        <h3 style={{ fontSize: ".95rem" }}>ジャンル記号</h3>
        <ul
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: ".25rem 1rem",
            listStyle: "none",
            padding: 0,
          }}
        >
          {GENRES.map((g) => (
            <li key={g.id}>
              <span aria-hidden="true" style={{ color: g.color }}>
                {g.symbol}
              </span>{" "}
              {g.name}
            </li>
          ))}
        </ul>
      </section>
      <section style={section}>
        <h2 style={{ fontSize: "1.1rem" }}>データの方針</h2>
        <p>
          地域区分は表示上の整理カテゴリであり、固定の文明区分ではありません。1つの項目が複数の地域・ジャンルに属することがあります。
        </p>
        <p>
          年代には確度（確定・推定・諸説あり）を付けています。現在の収録データは
          <strong>サンプル</strong>
          であり、各項目に参考出典を付けていますが、出典との照合は完了していません。確定情報としては扱わないでください。照合済みの項目から順次、個別ページを検索エンジンに公開します。
        </p>
      </section>
      <p>
        <Link href="/">年表へ戻る</Link>
      </p>
    </Main>
    <Footer>
      <p>世界史クロスビュー</p>
    </Footer>
  </>
)

export default AboutPage
