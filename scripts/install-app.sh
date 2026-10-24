#!/bin/bash
# ~/Applications に「VANG SELECT.app」を作る（Dock・Launchpad・Spotlight から起動できる）。
# アプリを開くと、サーバーが止まっていればバックグラウンドで起動し、Chrome のアプリウィンドウで画面を開く。
# Chrome が無ければ既定のブラウザで開く。project-kickoff の scripts/install-app.sh と同じ仕組み。
# 使い方: bash scripts/install-app.sh   （このリポジトリを移動したら、またはアイコンを差し替えたら再実行する）
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP="$HOME/Applications/VANG SELECT.app"
ICON_SRC="$PROJECT_DIR/assets/icon-source.png"

if [ ! -f "$ICON_SRC" ]; then
  echo "assets/icon-source.png がありません。" >&2
  exit 1
fi

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

# アイコンの元画像から macOS 用の AppIcon.icns を書き出す（sips と iconutil を使う）
ICONSET="$(mktemp -d)/AppIcon.iconset"
mkdir -p "$ICONSET"
for size in 16 32 128 256 512; do
  sips -z $size $size "$ICON_SRC" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null
  sips -z $((size * 2)) $((size * 2)) "$ICON_SRC" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns"
rm -rf "$(dirname "$ICONSET")"

cat > "$APP/Contents/Info.plist" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>VANG SELECT</string>
  <key>CFBundleDisplayName</key><string>VANG SELECT</string>
  <key>CFBundleIdentifier</key><string>local.ryotaly.vang-select-post-draft</string>
  <key>CFBundleExecutable</key><string>VangSelect</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>LSUIElement</key><true/>
</dict>
</plist>
EOF

# 起動用スクリプト。Finder から起動すると PATH が最小限なので、node・npm・claude の場所を明示する。
cat > "$APP/Contents/MacOS/VangSelect" <<EOF
#!/bin/bash
export PATH="/usr/local/bin:/opt/homebrew/bin:\$HOME/.local/bin:\$HOME/bin:/usr/bin:/bin:/usr/sbin:/sbin"
PROJECT_DIR="$PROJECT_DIR"
URL="http://localhost:3002/"
LOG="\$HOME/Library/Logs/vang-select-post-draft.log"

if ! curl -sf -o /dev/null "\${URL}api/config"; then
  if [ ! -d "\$PROJECT_DIR" ]; then
    osascript -e 'display alert "VANG SELECT" message "プロジェクトのフォルダが見つかりません。scripts/install-app.sh を再実行してください。"'
    exit 1
  fi
  cd "\$PROJECT_DIR"
  [ -d node_modules ] || npm install >>"\$LOG" 2>&1
  nohup node index.js >>"\$LOG" 2>&1 &
  disown
  for _ in \$(seq 1 50); do
    curl -sf -o /dev/null "\${URL}api/config" && break
    sleep 0.2
  done
  if ! curl -sf -o /dev/null "\${URL}api/config"; then
    osascript -e 'display alert "VANG SELECT" message "アプリを起動できませんでした。~/Library/Logs/vang-select-post-draft.log を確認してください。"'
    exit 1
  fi
fi

if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="\$URL"
else
  open "\$URL"
fi
EOF
chmod +x "$APP/Contents/MacOS/VangSelect"

# Finder・Dock にアイコンの変更をすぐ反映させる
touch "$APP"
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP" >/dev/null 2>&1 || true

echo "インストールしました: $APP"
echo "ログ: ~/Library/Logs/vang-select-post-draft.log"
