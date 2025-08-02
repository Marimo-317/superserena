@echo off
echo 🌙 月相壁紙アプリ - デモランチャー
echo SuperSerena Development - SPARC Implementation
echo ================================================
echo.

:MENU
echo 利用可能なデモ:
echo.
echo [1] CLI デモ (今日の月相)
echo [2] CLI デモ (性能テスト)
echo [3] CLI デモ (月相カレンダー)
echo [4] CLI デモ (クリスマス月相)
echo [5] Web デモ (ブラウザで開く)
echo [6] モバイルシミュレーター (ブラウザで開く)
echo [7] 全デモファイル一覧
echo [8] ヘルプ
echo [9] 終了
echo.

set /p choice="選択してください (1-9): "

if "%choice%"=="1" goto CLI_TODAY
if "%choice%"=="2" goto CLI_PERFORMANCE
if "%choice%"=="3" goto CLI_CALENDAR
if "%choice%"=="4" goto CLI_CHRISTMAS
if "%choice%"=="5" goto WEB_DEMO
if "%choice%"=="6" goto MOBILE_DEMO
if "%choice%"=="7" goto LIST_FILES
if "%choice%"=="8" goto HELP
if "%choice%"=="9" goto EXIT

echo 無効な選択です。
goto MENU

:CLI_TODAY
echo.
echo 🌙 今日の月相を計算中...
echo.
node cli-demo.js
pause
goto MENU

:CLI_PERFORMANCE
echo.
echo ⚡ 性能テスト実行中...
echo.
node cli-demo.js --performance
pause
goto MENU

:CLI_CALENDAR
echo.
echo 📅 今月の月相カレンダー表示中...
echo.
node cli-demo.js --calendar
pause
goto MENU

:CLI_CHRISTMAS
echo.
echo 🎄 2025年クリスマスの月相を計算中...
echo.
node cli-demo.js 2025-12-25
pause
goto MENU

:WEB_DEMO
echo.
echo 🌐 Webデモをブラウザで開いています...
start demo-app.html
goto MENU

:MOBILE_DEMO
echo.
echo 📱 モバイルシミュレーターをブラウザで開いています...
start mobile-simulator.html
goto MENU

:LIST_FILES
echo.
echo 📁 デモファイル一覧:
echo.
echo   cli-demo.js           - Node.js CLIデモ
echo   demo-app.html         - インタラクティブWebデモ
echo   mobile-simulator.html - モバイルアプリシミュレーター
echo   demo-launcher.bat     - このランチャー
echo.
echo 実装されている機能:
echo   ✅ Jean Meeusアルゴリズム高精度月相計算
echo   ✅ リアルタイム計算 (^<100ms目標)
echo   ✅ 日本語・英語対応
echo   ✅ ASCII アート月表示
echo   ✅ 性能テスト機能
echo   ✅ テーマエンジン
echo   ✅ モバイル UI/UX
echo.
pause
goto MENU

:HELP
echo.
echo 📖 月相壁紙アプリ デモヘルプ
echo.
echo このデモは以下のコンポーネントを含んでいます:
echo.
echo 【CLIデモ】
echo - Jean Meeusアルゴリズムによる高精度月相計算
echo - ASCII アートによる月相表示
echo - 性能テスト (1000回計算)
echo - 月相カレンダー表示
echo - カラフルなコンソール出力
echo.
echo 【Webデモ】
echo - インタラクティブな月相表示
echo - リアルタイム計算
echo - テーマ切り替え機能
echo - レスポンシブデザイン
echo.
echo 【モバイルシミュレーター】
echo - スマートフォンUI/UX
echo - タッチ操作対応
echo - ハプティックフィードバック
echo - モバイル最適化
echo.
echo 技術仕様:
echo - 計算精度: 99.9%%
echo - パフォーマンス目標: ^<100ms
echo - 対応言語: 日本語・英語
echo - フレームワーク: SuperSerena + SPARC
echo.
pause
goto MENU

:EXIT
echo.
echo 🌙 月相壁紙アプリデモを終了します。
echo SuperSerena Development - ありがとうございました！
echo.
pause
exit
