import cv2
import numpy as np

original = r"C:\Users\user\Downloads\recoverai_cat_test.mp4"
corrupted = r"C:\Users\user\Downloads\recoverai_cat_corrupted.mp4"

a = cv2.VideoCapture(original)
b = cv2.VideoCapture(corrupted)

if not a.isOpened():
    raise RuntimeError("Could not open ORIGINAL video")

if not b.isOpened():
    raise RuntimeError("Could not open CORRUPTED video")

index = 0
different = []

while True:
    ok_a, frame_a = a.read()
    ok_b, frame_b = b.read()

    if not ok_a or not ok_b:
        break

    difference = cv2.absdiff(
        frame_a,
        frame_b,
    )

    score = float(
        np.mean(difference)
    )

    if score > 5:
        different.append(
            (
                index,
                round(score, 2),
            )
        )

    index += 1

a.release()
b.release()

print()
print("=" * 60)
print("RECOVERAI DAMAGE VERIFICATION")
print("=" * 60)
print("Total frames checked:", index)
print("Different frames:", len(different))
print()

for frame_index, score in different:
    print(
        f"Frame {frame_index:03d}  "
        f"difference={score}"
    )

print()
print("=" * 60)