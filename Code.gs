/**
 * Google Drive フォルダ内の全フォームのGASを一括書き換えスクリプト
 *
 * ＜使い方＞
 * 1. 下の「設定」セクションを編集する
 * 2. dryRun() を実行して対象を確認する
 * 3. DRY_RUN を false にして updateAllFormScripts() を本番実行
 *
 * ＜事前設定（必須）＞
 * 1. Google Cloud Console > APIs & Services で "Apps Script API" を有効化
 *    https://console.cloud.google.com/apis/library/script.googleapis.com
 * 2. GASエディタ > 左メニュー「サービス(+)」> "Apps Script API" を追加
 *    （表示名: Script、バージョン: v1）
 * 3. appsscript.json の oauthScopes を確認（このファイルと同じフォルダに配置）
 */

// ===================================================================
// ▼▼▼ 設定 ▼▼▼
// ===================================================================

// 対象フォルダのID
// Google DriveでフォルダURLを開いた際の .../folders/XXXXXXXX の部分
const FOLDER_ID = 'YOUR_FOLDER_ID';

// ドライランモード
// true  → 対象の一覧を表示するだけ（書き換えは行わない）★最初はこちらで確認
// false → 実際に書き換えを実行
const DRY_RUN = true;

// ========== 新しいスクリプトの内容 ==========
// ここに書き換え後のコードを貼り付けてください
// すべてのフォームのスクリプトがこの内容に置き換わります
const NEW_SCRIPT_CODE = `
// ===== ここに新しいスクリプトのコードを貼り付けてください =====

function onFormSubmit(e) {
  // 例: フォーム送信時の処理
  const response = e.response;
  const timestamp = response.getTimestamp();
  console.log('送信日時: ' + timestamp);
}

`;

// ========== appsscript.json（マニフェスト）の扱い ==========
// null → 既存のマニフェストをそのまま保持する（推奨）
// オブジェクト → 全フォームのマニフェストをこの内容に置き換える
//   例: { timeZone: 'Asia/Tokyo', dependencies: {}, runtimeVersion: 'V8' }
const NEW_MANIFEST = null;

// ===================================================================
// ▲▲▲ 設定ここまで ▲▲▲
// ===================================================================


/**
 * 【推奨】最初にこちらを実行して対象を確認してください
 * DRY_RUN が true/false に関わらず、対象の一覧のみ表示します
 */
function dryRun() {
  console.log('=== ドライラン: 対象フォームとスクリプトを確認します ===\n');
  _run(true);
}

/**
 * 本番実行（DRY_RUN = false に設定してから実行してください）
 */
function updateAllFormScripts() {
  if (DRY_RUN) {
    console.log('⚠️  DRY_RUN が true のため書き換えを行いません。');
    console.log('    DRY_RUN を false に変更してから再実行してください。\n');
    _run(true);
    return;
  }

  const ok = Browser.msgBox(
    '確認',
    `フォルダ内の全フォームのGASを書き換えます。\n\nフォルダID: ${FOLDER_ID}\n\nよろしいですか？`,
    Browser.Buttons.OK_CANCEL
  );
  if (ok !== 'ok') {
    console.log('キャンセルしました。');
    return;
  }

  _run(false);
}


// ===================================================================
// 内部処理
// ===================================================================

/**
 * メイン処理
 * @param {boolean} isDryRun - ドライランかどうか
 */
function _run(isDryRun) {
  if (!FOLDER_ID || FOLDER_ID === 'YOUR_FOLDER_ID') {
    console.error('❌ FOLDER_ID が設定されていません。設定セクションを確認してください。');
    return;
  }

  const token = ScriptApp.getOAuthToken();

  // Step 1: フォルダ内の全フォームを収集
  console.log(`フォルダ検索中... (ID: ${FOLDER_ID})`);
  const formMap = _collectForms(FOLDER_ID);

  if (formMap.size === 0) {
    console.log('⚠️  フォームが1件も見つかりません。FOLDER_IDを確認してください。');
    return;
  }
  console.log(`フォームを ${formMap.size} 件発見\n`);

  // Step 2: Apps Script API でスクリプトを検索
  console.log('スクリプトプロジェクトを検索中...');
  const targetProjects = _findScriptProjects(formMap, token);
  console.log(`対象スクリプトを ${targetProjects.length} 件特定\n`);

  // Step 3: 結果を表示または更新
  let successCount = 0;
  let errorCount = 0;
  const projectParentIds = new Set();

  for (const project of targetProjects) {
    projectParentIds.add(project.parentId);
    const formName = formMap.get(project.parentId);

    if (isDryRun) {
      console.log(`📋 対象: "${formName}"`);
      console.log(`   フォームID : ${project.parentId}`);
      console.log(`   スクリプトID: ${project.scriptId}`);
      console.log(`   タイトル  : ${project.title}\n`);
    } else {
      try {
        _updateScriptContent(project.scriptId, token);
        console.log(`✅ 更新完了: "${formName}" (scriptId: ${project.scriptId})`);
        successCount++;
      } catch (e) {
        console.error(`❌ エラー: "${formName}" - ${e.message}`);
        errorCount++;
      }
    }
  }

  // スクリプトが見つからなかったフォームを報告
  const formsWithoutScript = [...formMap.entries()].filter(
    ([id]) => !projectParentIds.has(id)
  );

  if (formsWithoutScript.length > 0) {
    console.log('\n--- スクリプトが見つからなかったフォーム ---');
    formsWithoutScript.forEach(([id, name]) => {
      console.log(`  ⚠️  "${name}" (ID: ${id})`);
      console.log('     → フォームにスクリプトエディタが開かれていない可能性があります');
    });
  }

  if (isDryRun) {
    console.log('\n=== ドライラン完了 ===');
    console.log(`更新予定: ${targetProjects.length} 件 / スクリプトなし: ${formsWithoutScript.length} 件`);
    console.log('\n実行するには DRY_RUN を false にして updateAllFormScripts() を実行してください。');
  } else {
    console.log(`\n=== 完了 ===`);
    console.log(`成功: ${successCount} 件 / エラー: ${errorCount} 件 / スクリプトなし: ${formsWithoutScript.length} 件`);
  }
}

/**
 * フォルダ内の Google Forms を収集して Map<formId, formName> を返す
 * @param {string} folderId
 * @returns {Map<string, string>}
 */
function _collectForms(folderId) {
  const formMap = new Map();
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFilesByType(MimeType.GOOGLE_FORMS);
  while (files.hasNext()) {
    const file = files.next();
    formMap.set(file.getId(), file.getName());
  }
  return formMap;
}

/**
 * Apps Script API projects.list をページネーションしながら呼び出し、
 * 対象フォームに紐づくスクリプトプロジェクトを返す
 *
 * @param {Map<string, string>} formMap - フォームIDのセット
 * @param {string} token - OAuth トークン
 * @returns {Array<{scriptId: string, parentId: string, title: string}>}
 */
function _findScriptProjects(formMap, token) {
  const targets = [];
  let pageToken = null;
  let pageCount = 0;

  do {
    pageCount++;
    const url =
      'https://script.googleapis.com/v1/projects' +
      '?pageSize=50' +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');

    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() !== 200) {
      const body = response.getContentText();
      if (response.getResponseCode() === 403) {
        throw new Error(
          'Apps Script API へのアクセスが拒否されました (403)。\n' +
          '→ Google Cloud Console で Apps Script API が有効か確認してください。\n' +
          '→ GASエディタの「サービス」に "Apps Script API" が追加されているか確認してください。\n' +
          `詳細: ${body}`
        );
      }
      throw new Error(`projects.list API エラー (${response.getResponseCode()}): ${body}`);
    }

    const data = JSON.parse(response.getContentText());
    const projects = data.projects || [];

    for (const project of projects) {
      if (project.parentId && formMap.has(project.parentId)) {
        targets.push({
          scriptId: project.scriptId,
          parentId: project.parentId,
          title: project.title || '(タイトルなし)',
        });
      }
    }

    pageToken = data.nextPageToken;
    console.log(`  ページ ${pageCount} 検索済み（累計 ${targets.length} 件一致）`);
  } while (pageToken);

  return targets;
}

/**
 * 指定スクリプトの内容を書き換える
 * @param {string} scriptId
 * @param {string} token
 */
function _updateScriptContent(scriptId, token) {
  // マニフェストの取得（既存保持か新規か）
  const manifestSource =
    NEW_MANIFEST === null
      ? _getExistingManifest(scriptId, token)
      : (typeof NEW_MANIFEST === 'string'
          ? NEW_MANIFEST
          : JSON.stringify(NEW_MANIFEST));

  const content = {
    files: [
      {
        name: 'Code',
        type: 'SERVER_JS',
        source: NEW_SCRIPT_CODE,
      },
      {
        name: 'appsscript',
        type: 'JSON',
        source: manifestSource,
      },
    ],
  };

  const url = `https://script.googleapis.com/v1/projects/${scriptId}/content`;
  const response = UrlFetchApp.fetch(url, {
    method: 'put',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify(content),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    throw new Error(
      `updateContent 失敗 (${response.getResponseCode()}): ${response.getContentText()}`
    );
  }
}

/**
 * 既存スクリプトの appsscript.json を取得して文字列で返す
 * 取得できない場合はデフォルト値を返す
 * @param {string} scriptId
 * @param {string} token
 * @returns {string} - JSON文字列
 */
function _getExistingManifest(scriptId, token) {
  const defaultManifest = JSON.stringify({
    timeZone: 'Asia/Tokyo',
    dependencies: {},
    exceptionLogging: 'STACKDRIVER',
    runtimeVersion: 'V8',
  });

  try {
    const url = `https://script.googleapis.com/v1/projects/${scriptId}/content`;
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() !== 200) {
      return defaultManifest;
    }

    const data = JSON.parse(response.getContentText());
    const manifest = (data.files || []).find(f => f.name === 'appsscript');
    return manifest ? manifest.source : defaultManifest;
  } catch (e) {
    console.warn(`マニフェスト取得失敗 (${scriptId}): ${e.message} → デフォルト値を使用`);
    return defaultManifest;
  }
}
