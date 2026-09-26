from pathlib import Path

import cv2
import numpy as np


# ============================================================
# INPUT / OUTPUT
# ============================================================

INPUT_VIDEO = Path(
    r"C:\Users\user\Downloads\recoverai_cat_test.mp4"
)

OUTPUT_VIDEO = Path(
    r"C:\Users\user\Downloads\recoverai_cat_corrupted.mp4"
)


# ============================================================
# CORRUPTION SETTINGS
# ============================================================

# Frames that will be visually corrupted.
#
# Your video has 120 frames.
# At 24 FPS:
#
# 40 -> ~1.67 seconds
# 55 -> ~2.29 seconds
#
# We deliberately damage a short middle section.
DAMAGE_START = 40
DAMAGE_END = 55


def corrupt_frame(
    frame,
    frame_index,
):
    """
    Apply obvious but realistic-looking visual corruption.

    The container and video remain valid.
    Only selected pixels are damaged.
    """

    corrupted = frame.copy()

    height, width = corrupted.shape[:2]

    # --------------------------------------------------------
    # 1. Large rectangular corruption
    # --------------------------------------------------------

    x1 = int(width * 0.28)
    x2 = int(width * 0.78)

    y1 = int(height * 0.20)
    y2 = int(height * 0.72)

    corrupted[
        y1:y2,
        x1:x2
    ] = 0

    # --------------------------------------------------------
    # 2. Horizontal digital glitch bands
    # --------------------------------------------------------

    band_height = max(
        3,
        height // 40,
    )

    for i in range(0, 8):

        y = (
            int(
                height * 0.10
            )
            + i * band_height * 2
        )

        if (
            y + band_height
            >= height
        ):
            break

        shift = (
            20
            + (
                frame_index * 7
                + i * 13
            )
            % max(
                30,
                width // 8,
            )
        )

        source = corrupted[
            y:y + band_height
        ].copy()

        corrupted[
            y:y + band_height
        ] = np.roll(
            source,
            shift,
            axis=1,
        )

    # --------------------------------------------------------
    # 3. RGB channel displacement
    # --------------------------------------------------------

    blue, green, red = cv2.split(
        corrupted
    )

    shift = 10 + (
        frame_index % 15
    )

    red = np.roll(
        red,
        shift,
        axis=1,
    )

    blue = np.roll(
        blue,
        -shift,
        axis=1,
    )

    corrupted = cv2.merge(
        [
            blue,
            green,
            red,
        ]
    )

    # --------------------------------------------------------
    # 4. Salt-and-pepper corruption
    # --------------------------------------------------------

    rng = np.random.default_rng(
        seed=frame_index
    )

    noise_mask = rng.random(
        (
            height,
            width,
        )
    )

    corrupted[
        noise_mask < 0.015
    ] = 255

    corrupted[
        noise_mask > 0.985
    ] = 0

    # --------------------------------------------------------
    # 5. Corruption label for demo visibility
    # --------------------------------------------------------

    cv2.putText(
        corrupted,
        "CORRUPTED FRAME",
        (
            20,
            35,
        ),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (
            0,
            0,
            255,
        ),
        2,
        cv2.LINE_AA,
    )

    return corrupted


# ============================================================
# VALIDATE INPUT
# ============================================================

if not INPUT_VIDEO.exists():
    raise FileNotFoundError(
        f"Input video not found:\n{INPUT_VIDEO}"
    )


# ============================================================
# OPEN INPUT
# ============================================================

capture = cv2.VideoCapture(
    str(INPUT_VIDEO)
)

if not capture.isOpened():
    raise RuntimeError(
        "Unable to open input video."
    )


fps = capture.get(
    cv2.CAP_PROP_FPS
)

width = int(
    capture.get(
        cv2.CAP_PROP_FRAME_WIDTH
    )
)

height = int(
    capture.get(
        cv2.CAP_PROP_FRAME_HEIGHT
    )

)

frame_count = int(
    capture.get(
        cv2.CAP_PROP_FRAME_COUNT
    )
)


print()
print("=" * 60)
print("RECOVERAI CORRUPTED VIDEO GENERATOR")
print("=" * 60)

print(
    f"Input       : {INPUT_VIDEO}"
)

print(
    f"Resolution  : {width} x {height}"
)

print(
    f"FPS         : {fps}"
)

print(
    f"Frames      : {frame_count}"
)

print(
    f"Damage      : frames "
    f"{DAMAGE_START} → {DAMAGE_END}"
)

print()


# ============================================================
# OUTPUT CODEC
# ============================================================

fourcc = cv2.VideoWriter_fourcc(
    *"mp4v"
)

writer = cv2.VideoWriter(
    str(OUTPUT_VIDEO),
    fourcc,
    fps,
    (
        width,
        height,
    ),
)

if not writer.isOpened():
    capture.release()

    raise RuntimeError(
        "Unable to create output video."
    )


# ============================================================
# PROCESS FRAMES
# ============================================================

processed = 0
damaged = 0

while True:

    success, frame = capture.read()

    if not success:
        break

    if (
        DAMAGE_START
        <= processed
        <= DAMAGE_END
    ):

        frame = corrupt_frame(
            frame,
            processed,
        )

        damaged += 1

    writer.write(
        frame
    )

    processed += 1


# ============================================================
# CLEANUP
# ============================================================

capture.release()
writer.release()


# ============================================================
# RESULT
# ============================================================

if not OUTPUT_VIDEO.exists():
    raise RuntimeError(
        "Corrupted video was not created."
    )


print("=" * 60)
print("CORRUPTED VIDEO CREATED")
print("=" * 60)

print(
    f"Output      : {OUTPUT_VIDEO}"
)

print(
    f"Frames      : {processed}"
)

print(
    f"Corrupted   : {damaged}"
)

print(
    f"File size   : "
    f"{OUTPUT_VIDEO.stat().st_size:,} bytes"
)

print()
print(
    "Next step: upload this corrupted video "
    "to RECOVERAI."
)
print()