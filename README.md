# キングダム

GitHub Pagesで公開でき、将来的にCapacitorでiOSアプリとしてApp Store配信へ進めるWebカードゲームです。

## ゲーム概要

キングダムは、古代中華の戦場をモチーフにしたオリジナルカードゲームです。
既存漫画・アニメ・ゲーム作品の公式アプリではなく、キャラクターやカードは独自実装です。

- シールド制: 相手のシールドを割り切ってライフを削る。
- マナ制: 毎ターン使用可能マナが増え、強いカードへつながる。
- レーン制: 3つのレーンにユニットを配置して攻撃・防御する。
- ライフポイント制: プレイヤーHPは8000。カードのATK/HPは500から8000帯の数値で表現する。
- 属性相性: 火、水、森、雷、虚の相性で戦闘ダメージが変わる。
- 進化配置: 既存ユニットの上に強力なユニットを低コストで重ねられる。
- 罠: 攻撃を受けた時に反撃する伏せカードを使える。
- カード種別: 武将、計略、罠を色付きバッジで区別する。
- デッキ選択: 王道軍、火矢軍、水軍策士、城塞守備、雷騎突撃、黒龍覇道の6種類から選んで開始する。

商標やカード名は使わず、ルールとカードは独自実装です。

## 開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
npm run preview
```

`dist`は静的ファイルだけで構成されるため、GitHub Pagesで配信できます。

## GitHub Pages

1. GitHubの `Settings > Pages` で `GitHub Actions` を選びます。
2. `main` ブランチへpushすると `.github/workflows/pages.yml` が `dist` をデプロイします。

## iOS / App Storeへの進め方

このプロジェクトにはCapacitor設定を含めています。MacとXcode環境で以下を実行するとiOSプロジェクトを生成できます。

```bash
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

App Store配信には、Apple Developer Program、Bundle ID、署名証明書、App Store Connect設定、審査用メタデータが別途必要です。

## オンライン対戦について

現在のオンラインモードは、ルームIDとURL共有、ローカル保存のスナップショットまで実装しています。実ユーザー間のリアルタイム同期には、Firebase Realtime Database、Supabase Realtime、Cloudflare Durable Objectsなどの接続層を追加してください。
