import type { Metadata } from "next";

const URL_CANONICAL = "https://getpodprofit.com/legal/tokushoho";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
  description:
    "PODProfit (運営者: 岡崎五月) の特定商取引法に基づく表記。販売事業者情報・所在地・連絡先・販売価格・支払方法・返金規定の開示。",
  alternates: { canonical: URL_CANONICAL },
};

export default function TokushohoPage() {
  return (
    <article>
      <h1>特定商取引法に基づく表記</h1>
      <p>
        <em>最終更新日: 2026-05-11 / バージョン: 1.3</em>
      </p>

      <p>
        本ページは、特定商取引法第11条に基づく通信販売の表記です。当サービス
        (PODProfit、{" "}
        <a href="https://getpodprofit.com">https://getpodprofit.com</a>) は英語で
        提供される SaaS であり、主たる対象は海外の Print-on-Demand 事業者です
        が、日本国内からのご利用者向けに本表記を公開します。
      </p>

      <h2 id="seller">販売事業者</h2>
      <p>岡崎 五月 (屋号: PODProfit / 個人事業主)</p>

      <h2 id="responsible-manager">運営統括責任者</h2>
      <p>岡崎 五月 (販売事業者と同一)</p>

      <h2 id="address">所在地</h2>
      <p>
        〒150-0044
        <br />
        東京都渋谷区円山町5番3号 MIEUX渋谷ビル8階
      </p>
      <p>
        <em>
          ※ お客様からのご連絡は原則として下記メールアドレスでお受けします。
          書面でのご連絡をご希望の場合のみ、本住所宛にお送りください。
        </em>
      </p>

      <h2 id="contact">連絡先</h2>
      <table>
        <tbody>
          <tr>
            <td>メール</td>
            <td>
              <code>hello@getpodprofit.com</code>
            </td>
          </tr>
          <tr>
            <td>電話番号</td>
            <td>記載をご希望の方は上記メールアドレスまでご請求ください。</td>
          </tr>
          <tr>
            <td>営業時間</td>
            <td>
              メール対応のみ。原則 3 営業日以内 (繁忙時 7 営業日以内) に返信。
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id="prices">販売価格</h2>
      <table>
        <thead>
          <tr>
            <th>商品</th>
            <th>価格 (税抜・USD 建)</th>
            <th>備考</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Lifetime ライセンス</td>
            <td>USD 149</td>
            <td>100席限定 (うち8席は founding β tester リザーブ)</td>
          </tr>
          <tr>
            <td>Pro Monthly</td>
            <td>USD 9 / 月</td>
            <td>毎月自動更新、いつでも解約可</td>
          </tr>
          <tr>
            <td>Pro Annual</td>
            <td>USD 79 / 年</td>
            <td>毎年自動更新、月額換算で約 27% 割引</td>
          </tr>
          <tr>
            <td>POD Profit Calculator Excel Template</td>
            <td>USD 19</td>
            <td>2026-07-23 販売開始予定の単発デジタル商品</td>
          </tr>
          <tr>
            <td>POD Margin Benchmark Report PDF</td>
            <td>USD 29</td>
            <td>2026-08-20 販売開始予定の単発デジタル商品</td>
          </tr>
        </tbody>
      </table>
      <p>
        <em>
          価格は USD 建てで表示されます。日本円での請求額はカード会社の
          為替レートにより変動します。海外取引における消費税 / VAT / Sales
          Tax は Stripe Tax により決済時に自動計算・徴収されます。
        </em>
      </p>
      <p>
        <em>
          ※ 当事業者は消費税法上の免税事業者であり、適格請求書 (インボイス) の
          発行はできません。日本国内の課税事業者様で仕入税額控除を必要とされる
          場合は、ご購入前にメールにてご相談ください。
        </em>
      </p>

      <h2 id="extra-charges">価格以外の追加費用</h2>
      <p>
        本サービスはオンライン提供のデジタルサービス・デジタル商品のため、
        送料は発生しません。以下の費用がお客様負担となります:
      </p>
      <ul>
        <li>インターネット接続料金</li>
        <li>カード会社の為替手数料 (USD 決済のため)</li>
        <li>銀行・クレジットカード会社の事務手数料 (発生する場合)</li>
      </ul>

      <h2 id="payment-method">支払方法</h2>
      <p>
        全商品 (Lifetime / Pro Monthly / Pro Annual / Excel Template /
        Benchmark Report PDF) のクレジットカード決済を Stripe, Inc. 経由で
        受け付けます。
      </p>
      <p>
        対応カードブランド: Visa / Mastercard / American Express / JCB /
        Discover / Diners Club (Stripe の対応に準じる)
      </p>

      <h2 id="payment-timing">支払時期</h2>
      <ul>
        <li>
          <strong>Lifetime</strong>: ご注文確定時に一括決済
        </li>
        <li>
          <strong>Pro Monthly</strong>: ご注文確定時に初回決済、以降は毎月の更新日に自動決済
        </li>
        <li>
          <strong>Pro Annual</strong>: ご注文確定時に初回決済、以降は毎年の更新日に自動決済
        </li>
        <li>
          <strong>Excel / Report</strong>: ご注文確定時に一括決済
        </li>
      </ul>

      <h2 id="delivery">商品の引渡時期</h2>
      <ul>
        <li>
          <strong>Lifetime / Pro</strong>: 決済完了後、即時アクセス可能 (
          <a href="https://getpodprofit.com">getpodprofit.com</a> にログイン)
        </li>
        <li>
          <strong>Excel Template / Benchmark Report PDF</strong>: 決済完了後、
          即時にダウンロードリンクをメール送信
        </li>
      </ul>

      <h2 id="refund">返品・返金規定</h2>
      <p>
        本サービスはデジタル商品のため、お客様都合による返品・返金は原則として
        お受けしておりません。以下の例外条件に該当する場合のみ、個別にご相談を
        承ります。
      </p>
      <ul>
        <li>
          <strong>Lifetime</strong>: ご注文後 7 日以内、かつ計算機を 1 度も
          起動していない場合 (アクセスログで確認)。Lifetime
          ライセンスは PODProfit のサービス運営期間中の利用権を保証するもので
          あり、サービスが終了した場合の返金保証は含みません。
        </li>
        <li>
          <strong>Pro Monthly</strong>: 解約以降の自動課金を停止します (日割り
          返金は行いません)。解約後も<strong>当月末まで</strong>サービスは継続
          利用可能です。当社側のシステム起因の課金エラーの場合は全額返金。
        </li>
        <li>
          <strong>Pro Annual</strong>: ご注文後 14 日以内は無条件で全額返金。
          以降は返金不可ですが、解約後も<strong>年度末 (次回更新日)
          まで</strong>サービスは継続利用可能です。
        </li>
        <li>
          <strong>Excel / Report</strong>: ダウンロード履歴が 0 件であることをサーバーログで確認できた場合のみ、ご注文後 14 日以内に限り返金検討
        </li>
        <li>
          <strong>重複課金</strong>: いかなる商品でも、システム起因で重複課金が
          発生した場合は 1 営業日以内に全額返金
        </li>
      </ul>
      <p>
        EU / 英国のお客様: デジタル商品のダウンロードリンクをお送りした
        時点で、消費者権利指令 (EU 2011/83/EU 第 16 条 m) に基づく 14 日間の
        撤回権は失効します (チェックアウト時に明示的に同意取得)。
      </p>
      <p>
        詳細は{" "}
        <a href="/legal/refunds">Refund Policy</a> および{" "}
        <a href="/legal/terms">Terms of Service §7</a> をご参照ください。
      </p>

      <h2 id="cancellation">解約方法</h2>
      <ul>
        <li>
          <strong>Pro Monthly / Pro Annual</strong>: ログイン後、Account ページ
          より自動更新を停止可能 (即時反映)
        </li>
        <li>
          <strong>Lifetime</strong>: 一括購入のため解約手続き不要
        </li>
      </ul>

      <h2 id="hardware-software">推奨動作環境</h2>
      <ul>
        <li>
          ブラウザ: 最新版の Chrome / Safari / Firefox / Edge (JavaScript 有効)
        </li>
        <li>インターネット接続環境</li>
        <li>
          Excel Template: Microsoft Excel (Mac/Windows) または Google Sheets / Apple Numbers (一部書式の互換性に注意)
        </li>
        <li>Benchmark Report PDF: 任意の PDF ビューア</li>
      </ul>

      <hr />

      <p>
        <em>
          本ページの内容は予告なく変更されることがあります。最新の情報は
          常に本ページをご参照ください。
        </em>
      </p>
    </article>
  );
}
