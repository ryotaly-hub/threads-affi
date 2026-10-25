# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow>=10"]
# ///
"""ページのアイコンを書き出す。uv run で動かす（Pillow は uv が用意する）。

    uv run scripts/make_icons.py assets/icon-source.png public/icons

生成した元画像（白い余白の上に青い角丸の正方形）から、正方形の部分だけを切り出し、
角の外側を透明にして、各サイズの PNG と favicon.ico を書き出す。
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SIZES = {"favicon-32.png": 32, "icon-192.png": 192, "icon-512.png": 512}
APPLE_TOUCH = ("apple-touch-icon.png", 180)


def main(src, out_dir):
    out = Path(out_dir)
    image = Image.open(src).convert("RGB")
    # 白に近くない画素の範囲 ＝ 青い角丸の正方形
    mask = image.convert("L").point(lambda v: 255 if v < 235 else 0)
    left, top, right, bottom = mask.getbbox()
    side = max(right - left, bottom - top)
    square = image.crop((left, top, left + side, top + side)).convert("RGBA")

    # 角丸の外側を透明に（元画像の角の丸みに合わせて、一辺の約22%の半径）
    scale = 4
    big = Image.new("L", (side * scale, side * scale), 0)
    ImageDraw.Draw(big).rounded_rectangle((0, 0, side * scale - 1, side * scale - 1), radius=int(side * scale * 0.22), fill=255)
    square.putalpha(big.resize((side, side), Image.LANCZOS))

    for name, size in SIZES.items():
        square.resize((size, size), Image.LANCZOS).save(out / name)
    square.resize((48, 48), Image.LANCZOS).save(out / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    # iOS は透明部分を黒くするので、ホーム画面用は角を切らない正方形にする（角丸は iOS が付ける）
    name, size = APPLE_TOUCH
    image.crop((left + side // 10, top + side // 10, left + side - side // 10, top + side - side // 10)) \
        .resize((size, size), Image.LANCZOS).save(out / name)
    print("\n".join(str(out / n) for n in [*SIZES, "favicon.ico", name]))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    main(sys.argv[1], sys.argv[2])
