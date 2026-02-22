# Google Form GAS Bulk Updater

Google Drive のフォルダ内にある **全 Google フォーム** のコンテナバインドスクリプト（GAS）を一括書き換えする Google Apps Script ツールです。

## 機能

- 指定フォルダ内の全 Google フォームを自動検出
- Apps Script REST API 経由でスクリプトを一括更新
- ドライランモード（書き換え前に対象を確認）
- 既存の `appsscript.json` を保持するオプション
- エラーハンドリング・進捗ログ

## 事前準備

1. **Apps Script API を有効化**
   - [Google Cloud Console](https://console.cloud.google.com/apis/library/script.googleapis.com) で `Apps Script API` を有効にする

2. **GAS スタンドアロンプロジェクトを作成**
   - [script.google.com](https://script.google.com) で新規プロジェクトを作成
   - `Code.gs` の内容を貼り付け
   - 左メニュー「サービス (+)」→「Apps Script API」を追加
   - `appsscript.json`（マニフェスト）をプロジェクト設定から表示してこのファイルの内容に置き換え

## 使い方

### 1. 設定

`Code.gs` 上部の設定セクションを編集:

```javascript
const FOLDER_ID = 'YOUR_FOLDER_ID'; // 対象フォルダのID（DriveのURLから取得）
const DRY_RUN = true;               // まず true でテスト確認

const NEW_SCRIPT_CODE = `
// ここに書き換え後のスクリプトを貼り付ける
function onFormSubmit(e) {
  // ...
}
`;
```

### 2. ドライランで確認

関数 `dryRun()` を実行して対象フォームとスクリプトの一覧を確認します。

### 3. 本番実行

問題なければ `DRY_RUN = false` に変更して `updateAllFormScripts()` を実行します。

## フォルダIDの確認方法

Google Drive でフォルダを開いたときの URL:
```
https://drive.google.com/drive/folders/XXXXXXXXXXXXXXXX
                                       ↑ これがフォルダID
```

## 注意事項

- `updateContent` はスクリプトファイルを**全置換**します（既存コードは削除されます）
- `NEW_MANIFEST = null` にすると既存の `appsscript.json` を保持します
- フォームに一度もスクリプトエディタを開いていない場合、スクリプトが存在せず「スクリプトなし」として報告されます

## ライセンス

MIT
