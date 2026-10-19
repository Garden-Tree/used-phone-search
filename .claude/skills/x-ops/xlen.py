"""X の文字数（重み付き）を数える。日本語など=2、ASCII=1、URL=23、上限280
  python .claude/skills/x-ops/xlen.py 下書き.txt   （または標準入力）
"""
import re, sys, unicodedata

def weight(text: str) -> int:
    n = 0
    for part in re.split(r"(https?://\S+)", text):
        if re.match(r"https?://", part):
            n += 23
            continue
        for ch in part:
            o = ord(ch)
            # X の twitter-text: U+0000-10FF, 2000-200D, 2010-201F, 2032-2037 は1、それ以外は2
            if o <= 0x10FF or 0x2000 <= o <= 0x200D or 0x2010 <= o <= 0x201F or 0x2032 <= o <= 0x2037:
                n += 1
            else:
                n += 2
    return n

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    src = open(sys.argv[1], encoding="utf-8").read() if len(sys.argv) > 1 else sys.stdin.buffer.read().decode("utf-8")
    src = unicodedata.normalize("NFC", src).rstrip("\n")
    w = weight(src)
    print(f"{w}/280", "OK" if w <= 280 else f"{w - 280} オーバー")
