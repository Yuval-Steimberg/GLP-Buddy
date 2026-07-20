#!/usr/bin/env python3
"""Generate the Google Play feature graphic (1024x500) from GLPenPal brand art.

Uses the real brand lockup (mark + wordmark + tagline) so typography/colour
match the app exactly. Produces two variants — a light "cream" one and a bolder
"sage gradient" one — for the user to choose from.
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 1024, 500
OUT = os.path.join(os.path.dirname(__file__), "..", "store-screenshots")
os.makedirs(OUT, exist_ok=True)

# Brand palette (from src/index.css :root)
CREAM = (246, 244, 238)
SAGE = (94, 140, 116)
SAGE_DEEP = (74, 116, 95)
SAGE_PALE = (198, 220, 205)
SAND = (194, 149, 95)
INK = (30, 42, 37)

LOCKUP = Image.open(os.path.join(os.path.dirname(__file__), "..", "public", "brand", "logo-lockup.png")).convert("RGBA")


def hx(c):
    return np.array(c, dtype=float)


def diagonal_gradient(size, c0, c1):
    """Smooth diagonal (top-left -> bottom-right) gradient as an RGB image."""
    w, h = size
    xs = np.linspace(0, 1, w)[None, :]
    ys = np.linspace(0, 1, h)[:, None]
    t = np.clip((xs + ys) / 2.0, 0, 1)
    a, b = hx(c0), hx(c1)
    arr = a[None, None, :] * (1 - t)[..., None] + b[None, None, :] * t[..., None]
    return Image.fromarray(arr.astype("uint8"), "RGB")


def soft_circle(draw_img, cx, cy, r, color, alpha):
    """Draw a blurred translucent circle onto an RGBA overlay."""
    layer = Image.new("RGBA", draw_img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (alpha,))
    layer = layer.filter(ImageFilter.GaussianBlur(r * 0.12))
    draw_img.alpha_composite(layer)


def place_lockup(canvas, target_w, cx, cy):
    scale = target_w / LOCKUP.width
    lw, lh = int(LOCKUP.width * scale), int(LOCKUP.height * scale)
    lk = LOCKUP.resize((lw, lh), Image.LANCZOS)
    canvas.alpha_composite(lk, (int(cx - lw / 2), int(cy - lh / 2)))


# ---- Variant 1: CREAM (calm, matches app background) ------------------------
def variant_cream():
    base = diagonal_gradient((W, H), CREAM, (236, 234, 226)).convert("RGBA")
    # subtle brand accent blobs, well away from the centred logo
    soft_circle(base, 120, 90, 150, SAGE, 34)
    soft_circle(base, W - 110, H - 70, 180, SAGE_PALE, 70)
    soft_circle(base, W - 180, 70, 70, SAND, 30)
    # thin gradient underline accent under the wordmark
    place_lockup(base, 660, W / 2, H / 2 - 6)
    accent = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ad = ImageDraw.Draw(accent)
    ad.rounded_rectangle([W / 2 - 90, H / 2 + 120, W / 2 + 90, H / 2 + 128], radius=4, fill=SAGE + (255,))
    base.alpha_composite(accent)
    return base.convert("RGB")


# ---- Variant 2: SAGE (bold, high-contrast banner) ---------------------------
def variant_sage():
    base = diagonal_gradient((W, H), SAGE_DEEP, SAGE_PALE).convert("RGBA")
    soft_circle(base, 150, H - 60, 190, (255, 255, 255), 26)
    soft_circle(base, W - 120, 90, 150, (255, 255, 255), 22)
    soft_circle(base, W - 90, H - 90, 90, SAND, 40)
    # cream rounded badge to carry the dark lockup on the sage field
    badge = Image.new("RGBA", base.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(badge)
    bw, bh = 720, 300
    x0, y0 = (W - bw) / 2, (H - bh) / 2
    # soft shadow
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([x0, y0 + 10, x0 + bw, y0 + bh + 10], radius=44, fill=(20, 30, 26, 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    base.alpha_composite(shadow)
    bd.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=44, fill=CREAM + (255,))
    base.alpha_composite(badge)
    place_lockup(base, 560, W / 2, H / 2)
    return base.convert("RGB")


p1 = os.path.join(OUT, "play-feature-graphic-cream.png")
p2 = os.path.join(OUT, "play-feature-graphic-sage.png")
variant_cream().save(p1, "PNG")
variant_sage().save(p2, "PNG")
print("wrote", p1)
print("wrote", p2)
for p in (p1, p2):
    im = Image.open(p)
    print(os.path.basename(p), im.size, im.mode, f"{os.path.getsize(p)//1024} KB")
