先ほど構築した究極の開発環境（Serena MCP + SuperClaude + SPARCカスタムエージェント）の完全動作テストを実施します。各コンポーネントの動作確認と統合テストを段階的に行い、問題があれば詳細を報告してください。

【🎯 テスト目標】
- 全コンポーネントの正常動作確認
- トークン削減効果の測定
- 並列実行能力の検証
- 統合ワークフローの動作確認
- エラーや警告の検出

【📋 テスト計画】
Phase 1: 基本動作確認（5分）
Phase 2: Serena MCP機能テスト（10分）
Phase 3: SuperClaudeコマンドテスト（5分）
Phase 4: カスタムエージェントテスト（10分）
Phase 5: 統合ワークフローテスト（10分）
Phase 6: パフォーマンス測定（5分）

===== Phase 1: 基本動作確認 =====

1. 環境状態チェック：
```powershell
# Pythonバージョン確認
python --version

# uvコマンド確認
uv --version

# プロジェクト構造確認
Get-ChildItem -Path . -Recurse -Directory | Where-Object {$_.Name -match "\.claude|\.serena|\.venv"} | Select-Object FullName

# バックアップ確認
Get-ChildItem -Path "$env:USERPROFILE" -Filter ".claude_backup_*" | Select-Object Name, LastWriteTime

Claude設定確認：

# ヘルプコマンドで新機能確認
/help

# 利用可能なツール確認（Serenaツールが表示されるか）
List all available tools including MCP tools
===== Phase 2: Serena MCP機能テスト =====

Serena基本機能テスト：

# プロジェクトアクティベーション状態確認
Tell me the current active project status using Serena

# セマンティック検索テスト
Use Serena's mcp__serena__find_symbol to find all functions in the current directory

# シンボル概要テスト
Use mcp__serena__get_symbols_overview on the current directory and report the structure

トークン使用量測定（ベースライン）：

# 通常のファイル読み込みでトークン使用量を記録
Read all files in the current directory using the standard Read tool and count the tokens used

# Serenaでの同等操作
Now perform the same analysis using only Serena's semantic tools and compare token usage

# 削減率を計算して報告
Calculate and report the token reduction percentage
===== Phase 3: SuperClaudeコマンドテスト =====

SuperClaudeコマンド動作確認：

# コマンド一覧確認
/sc:index

# プロジェクト分析
/sc:analyze

# ドキュメント生成テスト
/sc:document README.md for this test environment

# トラブルシューティングテスト
/sc:troubleshoot "test if all components are working"

ペルソナ自動選択テスト：

# 自然言語でのペルソナ起動確認
Analyze the security implications of the current setup

# 複数ペルソナの協調確認
Design a simple REST API endpoint and tell me which personas were activated
===== Phase 4: カスタムエージェントテスト =====

個別エージェント動作確認：

# エージェント一覧表示
/agents

# SPARC Orchestratorテスト
Tell sparc-orchestrator to create a simple test plan

# SPARC Architectテスト
Ask sparc-architect to design a basic microservice architecture

# SPARC Coderテスト
Tell sparc-coder to implement a simple hello world function with tests

# SPARC TDDテスト
Ask sparc-tdd to create a test suite for a calculator function

# SPARC Security Reviewerテスト
Tell sparc-security-reviewer to analyze potential vulnerabilities in a login function

エージェント間連携テスト：

# 複数エージェントの連携
Tell sparc-orchestrator to coordinate sparc-architect and sparc-coder to create a simple user model with CRUD operations
===== Phase 5: 統合ワークフローテスト =====

SPARCフロー完全テスト：

# 小規模機能でSPARCフロー実行
/sparc-flow "test-todo" "Create a simple TODO API with CRUD operations"

# 実行ログを確認し、各フェーズの完了を報告
Report the completion status of each SPARC phase

並列実行テスト：

# バッチ開発コマンドテスト
/batch-dev Execute the following in parallel:
1. sparc-coder: Create user model
2. sparc-tdd: Create user model tests
3. sparc-architect: Design user service architecture
4. sparc-security-reviewer: Review user data handling

# 並列実行の結果を報告
Report which tasks completed successfully and any coordination issues

メモリ永続化テスト：

# メモリへの保存
Store test results in Serena memory with key "integration-test-results"

# メモリからの読み込み
Read back the stored memory and confirm persistence
===== Phase 6: パフォーマンス測定 =====

総合パフォーマンス評価：

# トークン使用統計
Calculate total tokens used in this test session vs estimated usage without optimizations

# 実行時間測定
Measure and report the time taken for each phase

# エラー/警告の集計
List any errors, warnings, or issues encountered during testing

最終レポート生成：

Generate a comprehensive test report including:
1. Component Status (✓ Working, ⚠️ Warning, ❌ Failed)
   - Serena MCP: [status]
   - SuperClaude: [status]
   - Custom Agents: [status]
   - Integration: [status]

2. Performance Metrics
   - Token Reduction: [percentage]
   - Execution Speed: [baseline vs optimized]
   - Parallel Processing: [efficiency]

3. Issues Found
   - Critical: [list]
   - Warnings: [list]
   - Recommendations: [list]

4. Feature Verification
   - Semantic Code Analysis: [status]
   - AI Personas: [status]
   - SPARC Workflow: [status]
   - Parallel Execution: [status]
   - Memory Persistence: [status]

5. Ready for Production?
   - Overall Assessment: [Yes/No]
   - Required Fixes: [list]
【🚨 エラー時の対処】
もしテスト中にエラーが発生した場合：

エラーの詳細を記録
影響を受けるコンポーネントを特定
可能な修正方法を提案
修正後に該当テストを再実行

【📊 期待される結果】
成功基準：

✅ 全コンポーネントが「Working」ステータス
✅ トークン削減率 60%以上
✅ 全エージェントが正常応答
✅ SPARCフローが完全実行
✅ 並列実行が成功

このテストを完了することで、構築した開発環境が本番使用可能であることを確認できます。
テストを開始してください。各フェーズの結果を詳細に報告し、最後に総合評価レポートを提供してください。

## 🎯 このテストプロンプトの特徴

1. **段階的検証**: 基本機能から統合機能まで順次確認
2. **定量的測定**: トークン使用量、実行時間を数値で評価
3. **エラー検出**: 問題があれば即座に特定
4. **包括的レポート**: 全機能の状態を一覧で確認
5. **実践的テスト**: 実際の開発シナリオでの動作確認

このテストにより、導入した環境が期待通りに動作しているかを完全に検証できます！