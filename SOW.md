# 業務仕様書（Statement of Work）

**プロジェクト名:** Google フォーム GAS 一括書き換えツール
**リポジトリ:** `kondoyuri-design/google-form-gas-updater`
**作成日:** 2026年2月22日
**ステータス:** 完成・テスト待ち

---

## 1. 背景・目的

Google Drive の特定フォルダ内に存在する多数の Google フォームに、それぞれコンテナバインドスクリプト（GAS）が紐づいている。これらのスクリプトを個別に編集すると工数がかかるため、一括書き換えを自動化するツールを作成する。

---

## 2. 作業範囲

### 対象

| 項目 | 内容 |
|------|------|
| 対象ファイル | Google Drive フォルダ直下の Google フォーム（サブフォルダなし） |
| スクリプト種別 | コンテナバインドスクリプト（各フォームのスクリプトエディタで管理されているもの） |
| 書き換え内容 | 全フォームのスクリプトを同一内容に置き換え |

### 対象外

- サブフォルダ内のフォーム
- スタンドアロン GAS プロジェクト
- Google スプレッドシート・ドキュメント等のフォーム以外のファイル

---

## 3. 成果物

| ファイル | 説明 |
|----------|------|
| `Code.gs` | 一括書き換えを実行する GAS スクリプト本体 |
| `appsscript.json` | OAuth スコープ等のマニフェスト設定 |
| `README.md` | セットアップ手順・使い方ドキュメント |
| `SOW.md` | 本ドキュメント |

---

## 4. 技術仕様

### 使用 API・サービス

| API | 用途 | スコープ |
|-----|------|----------|
| Google Apps Script REST API (`v1`) | スクリプトプロジェクトの取得・更新 | `https://www.googleapis.com/auth/script.projects` |
| Google Drive API（DriveApp） | フォルダ内フォームの一覧取得 | `https://www.googleapis.com/auth/drive.readonly` |

### 主要な処理フロー

```
1. DriveApp でフォルダ内の全 Google フォームを収集（MimeType.GOOGLE_FORMS）
      ↓
2. Apps Script REST API の projects.list をページネーションしながら呼び出し
      ↓
3. project.parentId がフォーム ID と一致するプロジェクトを特定
      ↓
4. projects.updateContent で各スクリプトを書き換え
   - Code.gs: 新スクリプトの内容に置き換え
   - appsscript.json: 既存マニフェストを保持（設定変更可）
```

### 設定パラメータ

| 定数 | 説明 | デフォルト |
|------|------|------------|
| `FOLDER_ID` | 対象フォルダの Drive ID | 要設定 |
| `DRY_RUN` | `true` = 確認のみ、`false` = 実際に書き換え | `true` |
| `NEW_SCRIPT_CODE` | 書き換え後のスクリプトの内容 | 要設定 |
| `NEW_MANIFEST` | 新しいマニフェスト内容（`null` = 既存を保持） | `null` |

---

## 5. 事前準備（実行者の作業）

以下はツール利用者が一度だけ行う設定作業。

1. **Apps Script API の有効化**
   Google Cloud Console > APIs & Services > `Apps Script API` を有効にする
   URL: `https://console.cloud.google.com/apis/library/script.googleapis.com`

2. **GAS スタンドアロンプロジェクトの作成**
   - `script.google.com` で新規プロジェクトを作成
   - `Code.gs` の内容を貼り付け
   - 左メニュー「サービス (+)」→「Apps Script API」を追加

3. **マニフェストの設定**
   - プロジェクト設定から `appsscript.json` の表示をON
   - `appsscript.json` の内容を本リポジトリのファイルで置き換え

4. **スクリプトの設定**
   - `FOLDER_ID` に対象フォルダの ID を設定
   - `NEW_SCRIPT_CODE` に書き換え後のコードを貼り付け

---

## 6. 実行手順

| ステップ | 関数 | 説明 |
|----------|------|------|
| 1. 確認 | `dryRun()` | 対象フォームとスクリプト一覧を表示（書き換えなし） |
| 2. 本番実行 | `updateAllFormScripts()` | `DRY_RUN = false` に変更してから実行・確認ダイアログあり |

---

## 7. エラー対応

| エラー | 原因 | 対処 |
|--------|------|------|
| `403 Forbidden` | Apps Script API が未有効、またはサービス未追加 | Cloud Console で API を有効化 / GASエディタでサービスを追加 |
| フォームが検出されない | `FOLDER_ID` が誤り、またはフォームがサブフォルダにある | フォルダ ID を確認 |
| 「スクリプトなし」と報告される | フォームのスクリプトエディタを一度も開いていない | 対象フォームを開き、スクリプトエディタを起動してスクリプトを生成する |

---

## 8. 制約・注意事項

- `projects.updateContent` はスクリプトファイルを**全置換**する（既存コードは削除される）
- 書き換えは不可逆なため、必ず `dryRun()` で対象を確認してから実行すること
- `projects.list` は最大 50 件/ページで自動ページネーション済み
- GAS の実行時間制限（6分）により、フォーム数が極めて多い場合は分割実行が必要な場合がある

---

## 9. 改訂履歴

| 日付 | バージョン | 内容 |
|------|------------|------|
| 2026-02-22 | 1.0 | 初版作成 |
