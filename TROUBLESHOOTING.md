# SuperClaude GitHub Actions Troubleshooting Guide

## 🚨 Common Issues and Solutions

### 1. Workflow Not Triggering

**症状**: `@claude` コメント後もワークフローが開始しない

**確認事項**:
- [ ] リポジトリの Actions が有効になっているか
- [ ] CLAUDE_CODE_OAUTH_TOKEN が正しく設定されているか
- [ ] Issue/PR にコメント権限があるか

**解決方法**:
1. Settings → Actions → General → Actions permissions を確認
2. "Allow all actions and reusable workflows" を選択
3. Secrets に CLAUDE_CODE_OAUTH_TOKEN が存在することを確認

### 2. Authentication Error

**症状**: "Authentication failed" または "Invalid OAuth token"

**解決方法**:
1. Claude MAX サブスクリプションが有効か確認
2. OAuth トークンを再生成:
   - Claude Code CLI で `/refresh-token` 実行
   - 新しいトークンを GitHub Secrets に更新

### 3. Quality Gates Failing

**症状**: セキュリティやパフォーマンステストで失敗

**確認事項**:
- [ ] 既存のコードに脆弱性がないか
- [ ] package.json の依存関係が最新か
- [ ] TypeScript設定が正しいか

**解決方法**:
```bash
# ローカルで事前チェック
npm audit fix
npm run lint
npm test
```

### 4. Timeout Issues

**症状**: ワークフローが60分でタイムアウト

**解決方法**:
1. 複雑なタスクを分割
2. workflow の timeout-minutes を調整:
   ```yaml
   timeout-minutes: 120  # 最大6時間まで
   ```

### 5. PR Creation Failed

**症状**: 実装は完了したがPRが作成されない

**確認事項**:
- [ ] Branch protection rules の確認
- [ ] GitHub App の権限設定
- [ ] リポジトリの設定で PR 作成が許可されているか

**解決方法**:
1. Settings → Actions → General
2. "Allow GitHub Actions to create and approve pull requests" を有効化

## 📊 Debug Information Collection

問題が解決しない場合、以下の情報を収集:

1. **ワークフローログ**:
   - Actions → 失敗したワークフロー → ログをダウンロード

2. **Issue/PR の詳細**:
   - Issue番号、コメント内容、タイミング

3. **エラーメッセージ**:
   - 完全なエラーメッセージとスタックトレース

4. **環境情報**:
   - リポジトリ名、ブランチ、最新のコミットハッシュ

## 🔗 Support Resources

- **GitHub Actions Status**: https://www.githubstatus.com/
- **Claude API Status**: https://status.anthropic.com/
- **SuperSerena Issues**: https://github.com/Marimo-317/superserena/issues

## 💡 Pro Tips

1. **テスト実行前の確認**:
   ```bash
   # ローカルでワークフロー構文チェック
   act -l  # GitHub Actions をローカルで実行
   ```

2. **段階的テスト**:
   - まず `basic` テストで基本機能確認
   - 次に `full-integration` で完全テスト

3. **ログの詳細化**:
   - ワークフローに `ACTIONS_STEP_DEBUG: true` を追加して詳細ログ取得

4. **キャッシュクリア**:
   - Actions → Management → Caches でキャッシュをクリア