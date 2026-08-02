"""Compatibility regression tests for MoviePy with Pillow 12."""

from pathlib import Path

from PIL import Image
from moviepy import ImageClip


def test_moviepy_imageclip_works_with_pillow_12(tmp_path: Path) -> None:
    """MoviePy should still build a basic clip from a PIL-generated image."""
    image_path = tmp_path / "frame.png"
    Image.new("RGB", (16, 16), color="red").save(image_path)

    clip = ImageClip(str(image_path)).with_duration(0.1)
    output_path = tmp_path / "clip.mp4"

    try:
        clip.write_videofile(
            str(output_path),
            fps=5,
            codec="libx264",
            audio=False,
        )
    finally:
        clip.close()

    assert output_path.exists()
    assert output_path.stat().st_size > 0
