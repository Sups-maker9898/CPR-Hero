#!/usr/bin/env python3
"""Build original 16-bit pixel art for CPR HERO.

Characters, props, and backgrounds are indexed pixels (no runtime rectangles).
Idle, talk, blink, kneel, and CPR frames are posed in place.
There are no walk or run cycles — the game is dialogue-driven.

Run from the project root:
  python/.venv/Scripts/python.exe python/make_sprites.py
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "img"
OUT.mkdir(parents=True, exist_ok=True)

# Locked to public/js/sprites.js metrics. BG_SCALE is 2, so sidewalk
# y=160 lands at canvas y=320, where standing sprites plant their feet.
ACTOR_W, ACTOR_H = 48, 64
CPR_W, CPR_H = 72, 64
PATIENT_W, PATIENT_H = 80, 32
COACH_W, COACH_H = 48, 48
BG_W, BG_H = 400, 300
SIDEWALK_FEET_Y = 160

# Genesis / SNES dusk palette. Keys are semantic so jackets can be swapped.
INK = (28, 14, 24, 255)


def rgba(r, g, b, a=255):
    return (r, g, b, a)


def png(path: Path, w: int, h: int, px: list[list[tuple]]) -> None:
    raw = b"".join(b"\x00" + b"".join(bytes(p) for p in row) for row in px)
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)

    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.write_bytes(data)


def canvas(w: int, h: int):
    return [[(0, 0, 0, 0) for _ in range(w)] for _ in range(h)]


def put(img, x, y, color):
    if color is None:
        return
    h = len(img)
    w = len(img[0])
    if 0 <= y < h and 0 <= x < w:
        img[y][x] = color


def fill(img, x, y, w, h, color):
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            put(img, xx, yy, color)


def blit(dst, src, x, y):
    for yy, row in enumerate(src):
        for xx, p in enumerate(row):
            if p[3]:
                put(dst, x + xx, y + yy, p)


def shade_box(img, x, y, w, h, light, mid, dark, ink=INK):
    """Rounded clothing block with a top-left key light and a 1px ink edge."""
    if w <= 0 or h <= 0:
        return
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            edge = xx == x or yy == y or xx == x + w - 1 or yy == y + h - 1
            corner = (xx - x < 2 and yy - y < 1) or (x + w - 1 - xx < 2 and yy - y < 1)
            if corner and (xx == x or xx == x + w - 1) and yy == y:
                continue
            if edge:
                put(img, xx, yy, ink)
                continue
            rel_x = (xx - x) / max(1, w - 1)
            rel_y = (yy - y) / max(1, h - 1)
            if rel_x < 0.28 and rel_y < 0.55:
                col = light
            elif rel_x > 0.72 or rel_y > 0.78:
                col = dark
            else:
                col = mid
            if rel_x > 0.62 and ((xx + yy) & 1) == 0 and rel_y > 0.35:
                col = dark
            put(img, xx, yy, col)


def ellipse(img, cx, cy, rx, ry, light, mid, dark):
    rx = max(1, rx)
    ry = max(1, ry)
    for y in range(cy - ry - 1, cy + ry + 2):
        for x in range(cx - rx - 1, cx + rx + 2):
            nx = (x + 0.5 - cx) / rx
            ny = (y + 0.5 - cy) / ry
            if nx * nx + ny * ny > 1:
                continue
            light_amt = -nx * 0.85 - ny * 0.95
            if light_amt > 0.38:
                col = light
            elif light_amt < -0.22:
                col = dark
            else:
                col = mid
            if -0.22 <= light_amt <= -0.02 and ((x + y) & 1) == 0:
                col = dark
            put(img, x, y, col)


def silhouette(img, ink=INK):
    """1px outside outline so the sprite reads on a busy street."""
    h = len(img)
    w = len(img[0])
    src = [row[:] for row in img]
    for y in range(h):
        for x in range(w):
            if src[y][x][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and src[ny][nx][3]:
                    img[y][x] = ink
                    break


def sheet(frames, fw, fh):
    img = canvas(fw * len(frames), fh)
    for i, fr in enumerate(frames):
        blit(img, fr, i * fw, 0)
    return img


def pal_hero():
    return dict(
        jacket=(46, 168, 150, 255),
        jacket_l=(118, 214, 186, 255),
        jacket_d=(24, 104, 98, 255),
        pants=(32, 44, 92, 255),
        pants_l=(62, 78, 138, 255),
        pants_d=(18, 24, 58, 255),
        hair=(36, 26, 34, 255),
        hair_l=(78, 64, 72, 255),
        hair_d=(18, 12, 18, 255),
        shoe=(42, 32, 36, 255),
        shoe_l=(92, 84, 88, 255),
    )


def pal_rick():
    p = pal_hero()
    p.update(
        jacket=(176, 52, 64, 255),
        jacket_l=(224, 112, 112, 255),
        jacket_d=(104, 24, 40, 255),
        pants=(48, 72, 132, 255),
        pants_l=(86, 114, 176, 255),
        pants_d=(26, 40, 84, 255),
        hair=(92, 58, 36, 255),
        hair_l=(156, 104, 64, 255),
        hair_d=(52, 30, 20, 255),
    )
    return p


def pal_maya():
    p = pal_hero()
    p.update(
        jacket=(214, 164, 48, 255),
        jacket_l=(244, 214, 120, 255),
        jacket_d=(132, 88, 24, 255),
        hair=(28, 18, 32, 255),
        hair_l=(88, 64, 96, 255),
        hair_d=(12, 8, 16, 255),
    )
    return p


def pal_medic():
    p = pal_hero()
    p.update(
        jacket=(236, 236, 232, 255),
        jacket_l=(255, 255, 250, 255),
        jacket_d=(168, 176, 184, 255),
        pants=(28, 48, 96, 255),
        pants_l=(52, 78, 140, 255),
        pants_d=(14, 24, 58, 255),
        hair=(48, 36, 28, 255),
        hair_l=(96, 72, 52, 255),
        hair_d=(24, 16, 14, 255),
    )
    return p


SKIN = (236, 186, 146, 255)
SKIN_L = (255, 214, 180, 255)
SKIN_D = (176, 116, 88, 255)
LIP = (168, 72, 86, 255)
MOUTH = (92, 36, 48, 255)
EYE = (248, 246, 240, 255)
PUPIL = (32, 26, 40, 255)
BROW = (42, 28, 32, 255)
BLUSH = (214, 120, 112, 255)
SOLE = (232, 228, 216, 255)
SHIRT = (226, 214, 198, 255)
PHONE = (24, 22, 32, 255)
SCREEN = (88, 236, 176, 255)
CROSS = (196, 40, 56, 255)
CROSS_W = (244, 236, 228, 255)


def eye(img, x, y, blink, worry=False):
    if worry:
        put(img, x, y - 3, BROW)
        put(img, x + 1, y - 2, BROW)
        put(img, x + 2, y - 2, BROW)
        put(img, x + 3, y - 1, BROW)
    else:
        fill(img, x, y - 2, 4, 1, BROW)
    if blink:
        fill(img, x, y + 1, 4, 1, PUPIL)
        return
    fill(img, x, y, 4, 3, EYE)
    put(img, x + 1, y + 1, PUPIL)
    put(img, x + 2, y + 1, PUPIL)
    put(img, x + 3, y, (255, 255, 255, 255))


def mouth(img, cx, cy, pose):
    if pose in ("talk", "phone", "kneel_talk"):
        fill(img, cx - 2, cy + 5, 5, 3, MOUTH)
        fill(img, cx - 2, cy + 5, 5, 1, LIP)
        put(img, cx, cy + 6, (255, 180, 176, 255))
    elif pose == "talk2":
        fill(img, cx - 1, cy + 5, 3, 2, MOUTH)
        fill(img, cx - 2, cy + 5, 5, 1, LIP)
    elif pose == "worry":
        put(img, cx - 3, cy + 5, LIP)
        fill(img, cx - 2, cy + 6, 5, 1, LIP)
        put(img, cx + 3, cy + 5, LIP)
    else:
        fill(img, cx - 2, cy + 6, 4, 1, LIP)
        put(img, cx - 1, cy + 5, SKIN_D)


def draw_head(img, cx, cy, pose, hair_style, pal):
    blink = pose == "blink"
    worry = pose == "worry"
    # Ears sit just outside the skull.
    shade_box(img, cx - 12, cy - 1, 4, 6, SKIN_L, SKIN, SKIN_D)
    shade_box(img, cx + 8, cy - 1, 4, 6, SKIN_L, SKIN, SKIN_D)
    put(img, cx - 10, cy + 1, SKIN_D)
    put(img, cx + 10, cy + 1, SKIN_D)
    # Neck
    shade_box(img, cx - 3, cy + 8, 7, 6, SKIN_L, SKIN, SKIN_D)
    ellipse(img, cx, cy, 10, 11, SKIN_L, SKIN, SKIN_D)
    # Hair cap
    hair, hair_l, hair_d = pal["hair"], pal["hair_l"], pal["hair_d"]
    for y in range(cy - 14, cy - 1):
        for x in range(cx - 12, cx + 13):
            nx = (x + 0.5 - cx) / 11
            ny = (y + 0.5 - (cy - 2)) / 10
            if nx * nx + ny * ny <= 1:
                col = hair_l if x < cx - 2 and y < cy - 6 else hair
                if x > cx + 4:
                    col = hair_d
                put(img, x, y, col)
    # Bangs leave a forehead window.
    fill(img, cx - 8, cy - 4, 5, 2, hair)
    fill(img, cx + 3, cy - 4, 5, 2, hair)
    put(img, cx - 9, cy - 3, hair_d)
    put(img, cx + 8, cy - 3, hair_d)
    # Sideburns
    fill(img, cx - 10, cy - 2, 3, 6, hair)
    fill(img, cx + 8, cy - 2, 3, 5, hair_d)
    # Shine
    put(img, cx - 4, cy - 10, hair_l)
    put(img, cx - 3, cy - 9, hair_l)
    if hair_style == "messy":
        put(img, cx - 6, cy - 15, hair)
        put(img, cx - 5, cy - 14, hair_l)
        put(img, cx + 2, cy - 15, hair)
        put(img, cx + 5, cy - 14, hair_d)
        put(img, cx - 8, cy - 13, hair)
        fill(img, cx - 11, cy + 2, 2, 4, hair)
        fill(img, cx + 10, cy - 1, 3, 3, hair_l)
    elif hair_style == "pony":
        put(img, cx + 10, cy + 2, (196, 48, 72, 255))
        put(img, cx + 11, cy + 2, (196, 48, 72, 255))
    eye(img, cx - 7, cy - 1, blink, worry)
    eye(img, cx + 2, cy - 1, blink, worry)
    put(img, cx, cy + 3, SKIN_D)
    put(img, cx + 1, cy + 4, SKIN_D)
    mouth(img, cx, cy, pose)
    put(img, cx - 8, cy + 3, BLUSH)
    put(img, cx + 7, cy + 3, BLUSH)


def arm_down(img, x, y, pal):
    shade_box(img, x, y, 6, 12, pal["jacket_l"], pal["jacket"], pal["jacket_d"])
    shade_box(img, x, y + 10, 6, 7, SKIN_L, SKIN, SKIN_D)
    fill(img, x + 1, y + 11, 4, 1, pal["jacket_d"])


def arm_up(img, x, y, pal):
    shade_box(img, x, y - 12, 6, 14, pal["jacket_l"], pal["jacket"], pal["jacket_d"])
    shade_box(img, x, y - 16, 6, 6, SKIN_L, SKIN, SKIN_D)


def arm_out(img, x, y, pal, reach=16):
    shade_box(img, x, y, reach, 6, pal["jacket_l"], pal["jacket"], pal["jacket_d"])
    shade_box(img, x + reach - 2, y - 1, 7, 7, SKIN_L, SKIN, SKIN_D)
    # fingers
    put(img, x + reach + 3, y - 2, SKIN)
    put(img, x + reach + 4, y, SKIN_L)
    put(img, x + reach + 3, y + 5, SKIN_D)


def arm_phone(img, x, y, pal):
    shade_box(img, x, y - 8, 6, 12, pal["jacket_l"], pal["jacket"], pal["jacket_d"])
    shade_box(img, x - 1, y - 14, 7, 8, SKIN_L, SKIN, SKIN_D)
    fill(img, x, y - 18, 6, 10, PHONE)
    fill(img, x + 1, y - 16, 4, 6, SCREEN)
    put(img, x + 2, y - 15, (220, 255, 236, 255))
    put(img, x + 1, y - 9, (180, 180, 188, 255))


def arm_cpr(img, x, y, pal, press):
    y += press
    shade_box(img, x, y, 18, 6, pal["jacket_l"], pal["jacket"], pal["jacket_d"])
    shade_box(img, x + 14, y - 1, 10, 8, SKIN_L, SKIN, SKIN_D)
    # stacked heel of the hand
    fill(img, x + 16, y + 1, 6, 3, SKIN_D)
    put(img, x + 18, y, SKIN_L)


def thumbs(img, x, y, pal):
    shade_box(img, x, y, 6, 10, pal["jacket_l"], pal["jacket"], pal["jacket_d"])
    shade_box(img, x - 1, y - 6, 8, 8, SKIN_L, SKIN, SKIN_D)
    fill(img, x + 2, y - 14, 4, 9, SKIN_L)
    fill(img, x + 3, y - 15, 2, 3, SKIN)
    put(img, x + 1, y - 4, SKIN_D)


def legs_stand(img, x, y, pal):
    shade_box(img, x, y, 8, 14, pal["pants_l"], pal["pants"], pal["pants_d"])
    shade_box(img, x + 9, y, 8, 14, pal["pants_l"], pal["pants"], pal["pants_d"])
    # shoes
    shade_box(img, x - 1, y + 12, 10, 6, pal["shoe_l"], pal["shoe"], INK)
    shade_box(img, x + 8, y + 12, 10, 6, pal["shoe_l"], pal["shoe"], INK)
    fill(img, x - 1, y + 16, 10, 2, SOLE)
    fill(img, x + 8, y + 16, 10, 2, SOLE)
    put(img, x + 2, y + 14, SOLE)
    put(img, x + 12, y + 14, SOLE)


def legs_kneel(img, x, y, pal):
    # Thighs fold forward, shoes tuck back. Feet still end near the frame bottom.
    shade_box(img, x - 2, y + 4, 16, 7, pal["pants_l"], pal["pants"], pal["pants_d"])
    shade_box(img, x + 10, y + 8, 12, 6, pal["pants_l"], pal["pants"], pal["pants_d"])
    shade_box(img, x - 4, y + 8, 10, 5, pal["shoe_l"], pal["shoe"], INK)
    shade_box(img, x + 14, y + 12, 11, 5, pal["shoe_l"], pal["shoe"], INK)
    fill(img, x - 4, y + 12, 10, 1, SOLE)
    fill(img, x + 14, y + 16, 11, 1, SOLE)


def torso(img, x, y, pal, medic=False):
    shade_box(img, x, y, 18, 16, pal["jacket_l"], pal["jacket"], pal["jacket_d"])
    # collar and shirt
    fill(img, x + 6, y + 1, 6, 3, SHIRT)
    put(img, x + 8, y + 2, pal["jacket_d"])
    # zipper
    for i in range(4, 14):
        put(img, x + 9, y + i, (210, 214, 206, 255) if i % 2 == 0 else (120, 124, 128, 255))
    # pocket
    fill(img, x + 3, y + 7, 5, 4, pal["jacket_d"])
    fill(img, x + 4, y + 8, 3, 2, pal["jacket"])
    if medic:
        fill(img, x + 2, y + 4, 7, 7, CROSS)
        fill(img, x + 4, y + 5, 3, 5, CROSS_W)
        fill(img, x + 3, y + 7, 5, 1, CROSS_W)
    else:
        fill(img, x + 12, y + 5, 5, 5, CROSS)
        fill(img, x + 14, y + 6, 1, 3, CROSS_W)
        fill(img, x + 13, y + 7, 3, 1, CROSS_W)


def draw_actor(pose, pal, hair_style, medic=False):
    """One in-place acting frame. No locomotion."""
    img = canvas(ACTOR_W, ACTOR_H)
    cx = 24
    kneel = pose in ("kneel", "kneel_talk")
    bob = 0
    # Contact shadow
    ellipse(img, cx, 61, 12, 2, (0, 0, 0, 70), (0, 0, 0, 90), (0, 0, 0, 110))
    if kneel:
        legs_kneel(img, 14, 42, pal)
        torso(img, 15, 30, pal, medic)
        draw_head(img, cx, 22, pose, hair_style, pal)
        if pose == "kneel_talk":
            arm_down(img, 10, 32, pal)
            arm_out(img, 30, 36, pal, 12)
        else:
            arm_down(img, 10, 32, pal)
            arm_down(img, 32, 32, pal)
    else:
        legs_stand(img, 16, 42 + bob, pal)
        torso(img, 15, 28 + bob, pal, medic)
        draw_head(img, cx, 16 + bob, pose, hair_style, pal)
        if pose == "worry":
            arm_up(img, 8, 30, pal)
            arm_up(img, 34, 30, pal)
        elif pose == "phone":
            arm_phone(img, 32, 30, pal)
            arm_down(img, 8, 30, pal)
        elif pose == "point":
            arm_down(img, 8, 30, pal)
            arm_out(img, 30, 34, pal, 12)
        elif pose == "thumbs":
            arm_down(img, 8, 30, pal)
            thumbs(img, 33, 28, pal)
        elif pose in ("talk", "talk2"):
            arm_down(img, 8, 30, pal)
            arm_out(img, 30, 34, pal, 8)
        elif pose == "breath":
            arm_down(img, 8, 31, pal)
            arm_down(img, 33, 31, pal)
            # chest lift — a single highlight row, not a hop
            fill(img, 18, 30, 12, 1, pal["jacket_l"])
        else:
            arm_down(img, 9, 30, pal)
            arm_down(img, 33, 30, pal)
    if hair_style == "pony":
        # Tail falls behind the right shoulder, tied close to the scalp.
        fill(img, 40, 22, 4, 22, pal["hair"])
        fill(img, 41, 26, 2, 14, pal["hair_l"])
        fill(img, 40, 22, 4, 2, (176, 48, 72, 255))
        put(img, 39, 20, pal["hair"])
        put(img, 43, 42, pal["hair_d"])
    silhouette(img)
    return img


def draw_cpr(pal, press):
    """Kneeling on the ground beside the hip, both hands on the sternum."""
    img = canvas(CPR_W, CPR_H)
    lean = 1 if press >= 4 else 0
    # Heels on the sidewalk. Thighs fold flat so the pose reads as sitting.
    ellipse(img, 46, 62, 16, 2, (0, 0, 0, 70), (0, 0, 0, 100), (0, 0, 0, 120))
    shade_box(img, 36, 48, 8, 10, pal["pants_l"], pal["pants"], pal["pants_d"])
    shade_box(img, 34, 56, 12, 5, pal["shoe_l"], pal["shoe"], INK)
    fill(img, 34, 60, 12, 1, SOLE)
    shade_box(img, 52, 50, 8, 8, pal["pants"], pal["pants"], pal["pants_d"])
    shade_box(img, 54, 56, 10, 5, pal["shoe"], pal["shoe"], INK)
    shade_box(img, 40, 42, 22, 8, pal["pants_l"], pal["pants"], pal["pants_d"])
    torso(img, 42, 26 + lean, pal, False)
    draw_head(img, 50, 18 + lean, "worry" if press >= 4 else "idle", "short", pal)
    # Elbows bend. The reach is only as long as a real kneeling arm.
    shade_box(img, 30, 32 + lean, 14, 7, pal["jacket_l"], pal["jacket"], pal["jacket_d"])
    shade_box(img, 20, 38 + press // 2, 14, 7, pal["jacket_l"], pal["jacket"], pal["jacket_d"])
    hand_y = 44 + press
    shade_box(img, 8, hand_y, 18, 11, SKIN_L, SKIN, SKIN_D)
    fill(img, 12, hand_y + 4, 10, 3, SKIN_D)
    put(img, 14, hand_y + 2, SKIN_L)
    silhouette(img)
    return img


def draw_patient(kind):
    """One connected adult lying on their back. Head is on the left."""
    img = canvas(PATIENT_W, PATIENT_H)
    drop = 1 if kind in ("press", "gasp_press") else 0
    rise = -1 if kind in ("gasp", "rise") else 0
    y = drop + rise
    ellipse(img, 42, 28, 26, 3, (0, 0, 0, 50), (0, 0, 0, 80), (0, 0, 0, 100))
    # Feet, then legs, torso, neck, head — each overlaps the last so the outline is one body.
    shade_box(img, 64, 16 + y, 12, 8, (120, 116, 120, 255), (48, 40, 44, 255), INK)
    fill(img, 64, 22 + y, 12, 2, SOLE)
    shade_box(img, 48, 14 + y, 20, 10, (78, 98, 156, 255), (36, 52, 108, 255), (18, 28, 64, 255))
    shade_box(img, 24, 11 + y, 28, 13, (110, 156, 206, 255), (52, 102, 168, 255), (28, 58, 112, 255))
    fill(img, 28, 13 + y, 8, 3, SHIRT)
    shade_box(img, 20, 13 + y, 8, 8, SKIN_L, SKIN, SKIN_D)
    ellipse(img, 13, 14 + y, 10, 8, SKIN_L, SKIN, SKIN_D)
    # Hair cap and sideburn so the skull reads.
    for yy in range(4 + y, 12 + y):
        for xx in range(4, 22):
            nx = (xx - 13) / 10
            ny = (yy - (8 + y)) / 8
            if nx * nx + ny * ny <= 1:
                put(img, xx, yy, (150, 104, 64, 255) if xx < 10 else (92, 56, 32, 255))
    fill(img, 4, 10 + y, 3, 5, (92, 56, 32, 255))
    # Arm across the ribs, hand near the collar.
    shade_box(img, 30, 16 + y, 16, 5, SKIN_L, SKIN, SKIN_D)
    put(img, 44, 17 + y, SKIN_L)
    put(img, 45, 18 + y, SKIN)
    if kind == "flutter":
        fill(img, 8, 13 + y, 4, 3, EYE)
        fill(img, 14, 13 + y, 4, 3, EYE)
        put(img, 9, 14 + y, PUPIL)
        put(img, 15, 14 + y, PUPIL)
    else:
        fill(img, 8, 14 + y, 5, 1, PUPIL)
        fill(img, 14, 14 + y, 5, 1, PUPIL)
    put(img, 12, 16 + y, SKIN_D)
    if kind in ("gasp", "gasp_press"):
        fill(img, 9, 17 + y, 6, 3, MOUTH)
        fill(img, 10, 18 + y, 4, 1, (40, 12, 20, 255))
    else:
        fill(img, 9, 18 + y, 5, 1, LIP)
    silhouette(img)
    return img


def draw_coach(pose):
    img = canvas(COACH_W, COACH_H)
    # shoulders / vest
    shade_box(img, 8, 30, 32, 16, (32, 120, 108, 255), (20, 92, 84, 255), (12, 58, 54, 255))
    fill(img, 14, 32, 20, 4, (236, 232, 220, 255))
    # stethoscope
    fill(img, 16, 34, 16, 2, (150, 156, 168, 255))
    put(img, 16, 36, (110, 116, 128, 255))
    put(img, 31, 36, (110, 116, 128, 255))
    fill(img, 15, 38, 3, 3, (72, 168, 152, 255))
    fill(img, 30, 38, 3, 3, (72, 168, 152, 255))
    # headset
    fill(img, 10, 18, 3, 8, (48, 52, 64, 255))
    fill(img, 35, 20, 4, 3, (48, 52, 64, 255))
    put(img, 38, 22, (88, 236, 176, 255))
    draw_head(img, 24, 16, pose, "short", pal_hero())
    # badge
    fill(img, 20, 40, 8, 5, (232, 188, 64, 255))
    fill(img, 22, 41, 4, 3, CROSS)
    silhouette(img)
    return img


def make_cast(pal, hair, medic=False, thumbs_pose=False):
    order = ["idle", "blink", "talk", "worry", "phone", "point", "kneel", "kneel_talk", "breath", "talk2"]
    frames = []
    for pose in order:
        use = pose
        if thumbs_pose and pose == "point":
            use = "thumbs"
        if medic and pose == "phone":
            use = "idle"
        frames.append(draw_actor(use, pal, hair, medic))
    return sheet(frames, ACTOR_W, ACTOR_H)


# --- backgrounds -----------------------------------------------------------

BAYER = (
    (0, 8, 2, 10),
    (12, 4, 14, 6),
    (3, 11, 1, 9),
    (15, 7, 13, 5),
)


def mix(a, b, t, x, y):
    thresh = BAYER[y & 3][x & 3] / 16
    src = b if thresh < t else a
    return (src[0], src[1], src[2], 255)


def sky(img, y0, y1):
    bands = (
        (16, 12, 40),
        (48, 24, 78),
        (104, 40, 92),
        (176, 72, 78),
        (232, 124, 72),
        (248, 176, 104),
    )
    span = max(1, y1 - y0 - 1)
    for y in range(y0, y1):
        t = (y - y0) / span
        scaled = t * (len(bands) - 1)
        i = min(int(scaled), len(bands) - 2)
        f = scaled - i
        for x in range(len(img[0])):
            put(img, x, y, mix(bands[i], bands[i + 1], f, x, y))


def brick_building(img, x, top, w, base, wall, mortar, lit_seed):
    for y in range(top, base):
        for xx in range(x, x + w):
            course = ((y // 4) & 1) * 6
            is_mortar = (y % 4 == 0) or ((xx + course) % 9 == 0)
            if xx >= x + w - 4:
                col = (wall[0] - 28, wall[1] - 18, wall[2] - 16)
            elif xx < x + 2:
                col = (min(255, wall[0] + 24), min(255, wall[1] + 16), min(255, wall[2] + 12))
            else:
                col = wall
            if is_mortar:
                col = mortar
            put(img, xx, y, (*[max(0, min(255, c)) for c in col], 255))
    # roof lip
    fill(img, x, top, w, 3, (22, 16, 28, 255))
    # windows
    for wy in range(top + 8, base - 10, 16):
        for wx in range(x + 5, x + w - 8, 12):
            lit = ((wx * 3 + wy * 5 + lit_seed) % 7) not in (0, 3)
            glass = (255, 206, 112, 255) if lit else (28, 36, 72, 255)
            fill(img, wx, wy, 7, 9, (18, 14, 24, 255))
            fill(img, wx + 1, wy + 1, 5, 7, glass)
            fill(img, wx + 3, wy + 1, 1, 7, (18, 14, 24, 180) if not lit else (180, 120, 48, 255))
            if lit and ((wx + wy) % 2 == 0):
                put(img, wx + 2, wy + 2, (255, 236, 180, 255))
            else:
                # curtain
                fill(img, wx + 1, wy + 1, 2, 7, (72, 48, 84, 255) if not lit else (196, 96, 72, 255))


def fire_escape(img, x, top, base):
    for y in range(top + 18, base - 4, 14):
        fill(img, x, y, 10, 1, (70, 74, 82, 255))
        fill(img, x, y, 1, 14, (50, 54, 62, 255))
        fill(img, x + 9, y, 1, 14, (50, 54, 62, 255))


def sedan(img, x, y, body, body_d, glass=(168, 214, 220, 255)):
    fill(img, x + 8, y, 36, 10, body)
    fill(img, x + 14, y + 1, 12, 6, glass)
    fill(img, x + 28, y + 1, 12, 6, glass)
    fill(img, x + 26, y + 1, 2, 6, (40, 44, 56, 255))
    fill(img, x, y + 8, 64, 12, body)
    fill(img, x, y + 8, 64, 2, body_d)
    fill(img, x + 2, y + 16, 60, 3, (36, 36, 40, 255))
    # wheels
    for wx in (x + 10, x + 44):
        fill(img, wx, y + 16, 10, 10, (20, 18, 22, 255))
        fill(img, wx + 2, y + 18, 6, 6, (70, 72, 78, 255))
        put(img, wx + 4, y + 20, (180, 180, 184, 255))
    # headlight + brake housing (JS flashes the brake pixels)
    fill(img, x + 60, y + 11, 4, 3, (255, 236, 180, 255))
    fill(img, x + 1, y + 11, 5, 3, (120, 28, 32, 255))
    fill(img, x + 30, y + 10, 1, 8, (30, 24, 28, 255))


def lamp_post(img, x, top, base):
    fill(img, x, top + 10, 3, base - top - 10, (86, 90, 98, 255))
    fill(img, x - 6, top, 16, 6, (255, 214, 120, 255))
    fill(img, x - 5, top + 1, 14, 3, (255, 236, 190, 255))
    fill(img, x - 4, top + 6, 12, 4, (90, 70, 40, 255))


def aed_cabinet(img, x, y, scale=1):
    w, h = 16 * scale, 20 * scale
    fill(img, x, y, w, h, (232, 176, 48, 255))
    fill(img, x, y, w, 3 * scale, (160, 100, 28, 255))
    fill(img, x + 3 * scale, y + 5 * scale, 10 * scale, 10 * scale, (196, 40, 56, 255))
    fill(img, x + 6 * scale, y + 6 * scale, 4 * scale, 8 * scale, (244, 236, 228, 255))
    fill(img, x + 4 * scale, y + 9 * scale, 8 * scale, 2 * scale, (244, 236, 228, 255))


def make_street():
    img = canvas(BG_W, BG_H)
    sky(img, 0, 150)
    # moon
    ellipse(img, 58, 36, 12, 12, (255, 236, 196, 255), (244, 214, 160, 255), (210, 170, 120, 255))
    fill(img, 62, 30, 4, 3, (232, 196, 140, 255))
    for sx, sy in ((18, 16), (120, 22), (300, 14), (360, 28), (250, 18), (180, 12)):
        put(img, sx, sy, (255, 244, 220, 255))
    # far wires
    for x in range(0, BG_W):
        y = 58 + int(6 * ((x % 40) - 20) / 20)
        put(img, x, y, (28, 22, 36, 255))

    brick_building(img, 0, 40, 70, 128, (120, 64, 72), (78, 40, 52), 1)
    fire_escape(img, 8, 40, 128)
    brick_building(img, 74, 26, 64, 128, (48, 52, 92), (30, 32, 58), 2)
    brick_building(img, 142, 48, 86, 128, (104, 56, 64), (70, 36, 46), 4)
    # shopfront
    fill(img, 142, 96, 86, 32, (64, 36, 48, 255))
    fill(img, 150, 104, 18, 24, (255, 206, 120, 255))
    fill(img, 154, 108, 10, 16, (120, 180, 200, 255))
    fill(img, 176, 108, 22, 20, (36, 28, 40, 255))
    fill(img, 178, 110, 18, 14, (88, 140, 160, 255))
    # striped awning
    for i, xx in enumerate(range(146, 220, 6)):
        fill(img, xx, 92, 6, 6, (196, 48, 64, 255) if i % 2 == 0 else (244, 236, 220, 255))
    # neon sign — MED — fx.png flickers a dim copy over this
    fill(img, 168, 52, 44, 16, (16, 12, 22, 255))
    neon_rows = ("#...#####.###.", "##.##...#.#..#", "#.#.###.#.#..#", "#...#...#.#..#", "#...#####.###.")
    for row, bits in enumerate(neon_rows):
        for col, ch in enumerate(bits):
            if ch == "#":
                put(img, 172 + col, 55 + row * 2, (88, 255, 190, 255))
                put(img, 172 + col, 56 + row * 2, (88, 255, 190, 255))
    brick_building(img, 232, 34, 78, 128, (42, 48, 86), (26, 28, 52), 3)
    brick_building(img, 314, 22, 86, 128, (92, 48, 62), (60, 30, 44), 5)
    # water tower
    fill(img, 348, 8, 4, 18, (70, 74, 82, 255))
    fill(img, 338, 6, 28, 12, (86, 92, 102, 255))
    fill(img, 340, 8, 24, 3, (140, 146, 156, 255))

    lamp_post(img, 132, 70, 168)
    # traffic pole
    fill(img, 300, 78, 3, 90, (70, 74, 82, 255))
    fill(img, 294, 74, 14, 28, (28, 26, 32, 255))

    # sidewalk
    for y in range(128, 190):
        for x in range(BG_W):
            slab = 150 if ((x // 24) + (y // 12)) % 2 == 0 else 132
            if y > 184:
                col = (168, 164, 150, 255)
            elif x % 24 == 0 or y % 12 == 0:
                col = (98, 96, 92, 255)
            else:
                col = (slab, slab - 4, slab - 8, 255)
            if (x * 5 + y * 9) % 37 == 0:
                col = (120, 116, 108, 255)
            put(img, x, y, col)
    # cracks
    for x in range(40, 360, 3):
        put(img, x, 156 + (x % 5), (80, 76, 72, 255))
    # curb
    fill(img, 0, 186, BG_W, 4, (210, 206, 190, 255))
    fill(img, 0, 190, BG_W, 2, (120, 116, 108, 255))
    # road
    for y in range(192, BG_H):
        for x in range(BG_W):
            base = 42 if (x + y) % 17 else 34
            put(img, x, y, (base, base, base + 4, 255))
    for x in range(10, BG_W, 28):
        fill(img, x, 230, 14, 3, (232, 196, 64, 255))
    # crosswalk
    for x in range(150, 250, 16):
        fill(img, x, 196, 8, 28, (220, 216, 200, 255))

    sedan(img, 8, 200, (176, 48, 56, 255), (110, 24, 36, 255))
    sedan(img, 250, 214, (36, 64, 120, 255), (20, 36, 78, 255))

    # hydrant, mailbox, bags, puddle
    fill(img, 46, 158, 8, 16, (176, 40, 48, 255))
    fill(img, 43, 164, 14, 4, (140, 28, 40, 255))
    fill(img, 48, 154, 4, 4, (90, 92, 98, 255))
    fill(img, 96, 150, 12, 18, (48, 78, 140, 255))
    fill(img, 98, 152, 8, 6, (120, 150, 190, 255))
    fill(img, 360, 160, 14, 12, (54, 58, 56, 255))
    fill(img, 374, 166, 10, 10, (40, 64, 48, 255))
    ellipse(img, 200, 172, 16, 4, (90, 78, 70, 255), (60, 70, 88, 255), (40, 48, 64, 255))
    put(img, 196, 171, (248, 200, 120, 255))
    aed_cabinet(img, 206, 100, 1)
    # bench
    fill(img, 270, 156, 28, 3, (120, 72, 48, 255))
    fill(img, 272, 159, 3, 8, (80, 48, 36, 255))
    fill(img, 294, 159, 3, 8, (80, 48, 36, 255))
    return img


def make_close():
    """Lower camera on the same sidewalk. Used once the crew is with the patient."""
    img = canvas(BG_W, BG_H)
    sky(img, 0, 70)
    # big brick wall
    brick_building(img, 0, 18, 400, 128, (116, 62, 70), (74, 38, 50), 6)
    # shop glass
    fill(img, 24, 48, 70, 80, (36, 44, 64, 255))
    fill(img, 28, 52, 62, 52, (120, 176, 188, 255))
    fill(img, 30, 78, 58, 26, (48, 72, 88, 255))
    for i, xx in enumerate(range(20, 100, 8)):
        fill(img, xx, 40, 8, 8, (196, 48, 64, 255) if i % 2 == 0 else (244, 236, 220, 255))
    # torn poster
    fill(img, 120, 40, 36, 48, (244, 228, 196, 255))
    fill(img, 124, 46, 28, 16, (196, 48, 64, 255))
    fill(img, 134, 48, 6, 12, (244, 236, 220, 255))
    fill(img, 128, 52, 16, 3, (244, 236, 220, 255))
    fill(img, 148, 78, 8, 10, (116, 62, 70, 255))  # torn corner
    # door
    fill(img, 180, 60, 34, 68, (48, 32, 36, 255))
    fill(img, 184, 66, 26, 40, (88, 64, 48, 255))
    put(img, 206, 88, (232, 188, 64, 255))
    lamp_post(img, 250, 36, 168)
    aed_cabinet(img, 300, 48, 2)
    fill(img, 330, 36, 3, 100, (70, 74, 82, 255))
    # sidewalk shares SIDEWALK_FEET_Y with the wide shot
    for y in range(128, 210):
        for x in range(BG_W):
            slab = 158 if ((x // 28) + (y // 14)) % 2 == 0 else 136
            if x % 28 == 0 or y % 14 == 0:
                col = (96, 94, 90, 255)
            else:
                col = (slab, slab - 6, slab - 10, 255)
            if (x * 3 + y * 11) % 41 == 0:
                col = (110, 104, 96, 255)
            put(img, x, y, col)
    for x in range(20, 380, 2):
        put(img, x, 168 + (x % 7), (78, 74, 70, 255))
    fill(img, 0, 206, BG_W, 5, (206, 200, 184, 255))
    for y in range(211, BG_H):
        for x in range(BG_W):
            base = 40 if (x * 2 + y) % 13 else 32
            put(img, x, y, (base, base, base + 6, 255))
    # stopped car nose at the curb — brake housing on the left edge
    sedan(img, -36, 224, (176, 48, 56, 255), (110, 24, 36, 255))
    sedan(img, 336, 228, (36, 40, 48, 255), (20, 22, 28, 255), glass=(70, 86, 96, 255))
    ellipse(img, 120, 190, 22, 5, (86, 74, 66, 255), (48, 58, 78, 255), (32, 36, 52, 255))
    return img


def make_fx():
    """Small overlays: neon, traffic lamp, brake light, streetlamp. Two frames each."""
    img = canvas(160, 48)
    # neon on/off at (0,0) and (48,0), 44x16
    def neon(ox, on):
        fill(img, ox, 0, 44, 16, (12, 10, 18, 255))
        color = (88, 255, 190, 255) if on else (28, 64, 58, 255)
        # M E D +
        glyphs = (0x7A, 0x7B, 0x7C)
        # hand pixels for MED+
        letters = ("#...#####.###.", "##.##...#.#..#", "#.#.###.#.#..#", "#...#...#.#..#", "#...#####.###.")
        for row, bits in enumerate(letters):
            for col, ch in enumerate(bits):
                if ch == "#":
                    put(img, ox + 4 + col, 3 + row * 2, color)
                    put(img, ox + 4 + col, 4 + row * 2, color)
        if on:
            put(img, ox + 2, 2, (180, 255, 220, 255))

    neon(0, True)
    neon(48, False)
    # traffic housing lamps: bright red, dim red. 14x28 at x=96 and x=112 — wait width.
    # Use y=20 row for lamps to avoid overlap: 14x20 at (0, 20) and (16, 20)
    def lamp(ox, bright):
        fill(img, ox, 20, 12, 26, (24, 22, 28, 255))
        red = (255, 64, 64, 255) if bright else (120, 24, 32, 255)
        fill(img, ox + 2, 22, 8, 6, red)
        fill(img, ox + 2, 30, 8, 6, (40, 28, 16, 255))
        fill(img, ox + 2, 38, 8, 6, (28, 48, 28, 255))

    lamp(0, True)
    lamp(16, False)
    # brake pixels 10x6 at (32, 20) and (44, 20)
    fill(img, 32, 22, 8, 4, (255, 60, 64, 255))
    fill(img, 44, 22, 8, 4, (90, 20, 28, 255))
    # lamp glow 18x10 at (56, 20) and (76, 20)
    fill(img, 56, 22, 16, 8, (255, 220, 140, 255))
    fill(img, 76, 22, 16, 8, (180, 140, 70, 255))
    return img


def make_ambulance():
    frames = []
    for phase in (0, 1):
        img = canvas(112, 56)
        # shadow
        fill(img, 8, 50, 96, 4, (0, 0, 0, 80))
        # body
        shade_box(img, 6, 16, 100, 28, (255, 255, 252, 255), (236, 238, 236, 255), (176, 184, 188, 255))
        fill(img, 6, 26, 100, 6, (196, 40, 52, 255))
        # cab
        shade_box(img, 70, 8, 32, 20, (255, 255, 252, 255), (230, 234, 236, 255), (160, 170, 176, 255))
        fill(img, 76, 12, 20, 10, (140, 196, 206, 255))
        fill(img, 84, 12, 2, 10, (40, 48, 64, 255))
        # side windows
        fill(img, 16, 20, 18, 10, (150, 200, 208, 255))
        fill(img, 40, 20, 18, 10, (150, 200, 208, 255))
        # paramedic silhouette in the window
        fill(img, 22, 22, 6, 8, (36, 48, 84, 255))
        fill(img, 20, 22, 10, 3, (236, 186, 146, 255))
        # cross
        fill(img, 48, 34, 12, 8, (196, 40, 52, 255))
        fill(img, 52, 32, 4, 12, (244, 236, 228, 255))
        fill(img, 46, 36, 16, 4, (244, 236, 228, 255))
        # light bar
        fill(img, 74, 4, 24, 5, (40, 40, 48, 255))
        if phase == 0:
            fill(img, 76, 5, 8, 3, (255, 48, 56, 255))
            fill(img, 88, 5, 8, 3, (48, 72, 220, 255))
        else:
            fill(img, 76, 5, 8, 3, (255, 140, 150, 255))
            fill(img, 88, 5, 8, 3, (170, 190, 255, 255))
        # wheels
        for wx in (18, 78):
            fill(img, wx, 40, 14, 12, (20, 18, 22, 255))
            fill(img, wx + 3, 43, 8, 7, (90, 92, 98, 255))
            put(img, wx + 6, 46, (220, 220, 224, 255))
        # bumper
        fill(img, 98, 30, 8, 8, (70, 74, 80, 255))
        frames.append(img)
    return sheet(frames, 112, 56)


def make_props():
    img = canvas(48, 28)
    # AED unit
    fill(img, 1, 2, 30, 22, (232, 176, 48, 255))
    fill(img, 1, 2, 30, 4, (150, 96, 28, 255))
    fill(img, 8, 8, 16, 12, (196, 40, 52, 255))
    fill(img, 14, 9, 4, 10, (244, 236, 228, 255))
    fill(img, 10, 13, 12, 3, (244, 236, 228, 255))
    put(img, 4, 18, (40, 40, 48, 255))
    # phone
    fill(img, 34, 4, 10, 18, PHONE)
    fill(img, 36, 6, 6, 10, SCREEN)
    put(img, 38, 8, (220, 255, 236, 255))
    put(img, 37, 18, (180, 180, 188, 255))
    return img


def main():
    png(OUT / "hero.png", ACTOR_W * 10, ACTOR_H, make_cast(pal_hero(), "short"))
    png(OUT / "rick.png", ACTOR_W * 10, ACTOR_H, make_cast(pal_rick(), "messy"))
    png(OUT / "maya.png", ACTOR_W * 10, ACTOR_H, make_cast(pal_maya(), "pony"))
    png(OUT / "medic.png", ACTOR_W * 10, ACTOR_H, make_cast(pal_medic(), "short", medic=True, thumbs_pose=True))
    cpr_frames = [draw_cpr(pal_hero(), press) for press in (0, 2, 5, 2)]
    png(OUT / "hero-cpr.png", CPR_W * 4, CPR_H, sheet(cpr_frames, CPR_W, CPR_H))
    kinds = ("still", "gasp", "press", "gasp_press", "rise", "flutter")
    png(OUT / "patient.png", PATIENT_W * 6, PATIENT_H, sheet([draw_patient(k) for k in kinds], PATIENT_W, PATIENT_H))
    coach_order = ("idle", "blink", "talk", "talk2")
    png(OUT / "coach.png", COACH_W * 4, COACH_H, sheet([draw_coach(p) for p in coach_order], COACH_W, COACH_H))
    png(OUT / "street.png", BG_W, BG_H, make_street())
    png(OUT / "close.png", BG_W, BG_H, make_close())
    png(OUT / "fx.png", 160, 48, make_fx())
    png(OUT / "ambulance.png", 224, 56, make_ambulance())
    png(OUT / "props.png", 48, 28, make_props())
    print("Wrote 16-bit sheets to", OUT)


if __name__ == "__main__":
    main()
