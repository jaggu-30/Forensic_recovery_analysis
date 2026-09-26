from __future__ import annotations

import json
import shutil
import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    File,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse

from app.services.video_reconstruction_service import (
    video_reconstruction_service,
)


router = APIRouter(
    prefix="/api/video-reconstruction",
    tags=["Video Reconstruction"],
)


VIDEO_EXTENSIONS = {
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".webm",
    ".m4v",
}


@router.get("/health")
def video_reconstruction_health():
    return {
        "success": True,
        "service": "RECOVERAI Video Reconstruction",
        "status": "online",
        "ffmpeg": "available",
        "pipeline": (
            "UPLOAD → PROBE → EXTRACT → "
            "VISUAL DAMAGE DETECTION → "
            "TEMPORAL RECONSTRUCTION → "
            "REASSEMBLE → VERIFY"
        ),
    }


@router.post("/analyze")
async def analyze_video(
    file: UploadFile = File(...),
):
    """
    Upload and reconstruct a video.

    The uploaded source is preserved.
    A recovered MP4 is generated and then copied
    to a stable job-specific location so that the
    frontend can stream it directly.
    """

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Video filename is missing.",
        )

    extension = (
        Path(file.filename)
        .suffix
        .lower()
    )

    if extension not in VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=(
                "Unsupported video format. "
                "Supported formats: MP4, MOV, AVI, "
                "MKV, WEBM and M4V."
            ),
        )

    job_id = uuid.uuid4().hex[:12]

    input_directory = (
        video_reconstruction_service.input_dir
    )

    input_directory.mkdir(
        parents=True,
        exist_ok=True,
    )

    safe_name = Path(
        file.filename
    ).name

    input_path = (
        input_directory
        / f"{job_id}_{safe_name}"
    )

    bytes_written = 0

    # ============================================================
    # SAVE UPLOAD
    # ============================================================

    try:
        with input_path.open("wb") as output:

            while True:
                chunk = await file.read(
                    1024 * 1024
                )

                if not chunk:
                    break

                output.write(chunk)
                bytes_written += len(chunk)

    except Exception as exc:

        if input_path.exists():
            input_path.unlink()

        raise HTTPException(
            status_code=500,
            detail={
                "error": (
                    "Failed to save uploaded video."
                ),
                "message": str(exc),
            },
        )

    if bytes_written <= 0:

        if input_path.exists():
            input_path.unlink()

        raise HTTPException(
            status_code=400,
            detail="Uploaded video is empty.",
        )

    # ============================================================
    # PROBE INPUT
    # ============================================================

    try:

        uploaded_probe = (
            video_reconstruction_service
            .probe_video(
                input_path
            )
        )

    except Exception as exc:

        raise HTTPException(
            status_code=422,
            detail={
                "error": (
                    "Uploaded file could not "
                    "be decoded as a valid video."
                ),
                "message": str(exc),
                "bytes_received": bytes_written,
            },
        )

    # ============================================================
    # RUN RECONSTRUCTION
    # ============================================================

    try:

        result = (
            video_reconstruction_service
            .reconstruct_video(
                input_path,
                investigation_id=job_id,
                max_frames=120,
            )
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail={
                "error": (
                    "Video reconstruction failed."
                ),
                "message": str(exc),
                "job_id": job_id,
            },
        )

    # ============================================================
    # NORMALIZE RECOVERED VIDEO LOCATION
    # ============================================================
    #
    # The reconstruction service may internally generate a
    # different extraction job ID.
    #
    # We therefore copy the final MP4 into:
    #
    # data/video_recovery/recovered/
    #
    # using the PUBLIC API job_id.
    #
    # This is the exact path used by the frontend.
    # ============================================================

    recovered_info = (
        result.get(
            "recovered_video",
            {},
        )
        if isinstance(result, dict)
        else {}
    )

    internal_output = (
        recovered_info.get(
            "output_path"
        )
    )

    stable_output = (
        video_reconstruction_service
        .recovered_dir
        / f"{job_id}_recovered.mp4"
    )

    if internal_output:

        internal_output_path = Path(
            internal_output
        )

        if (
            internal_output_path.exists()
            and internal_output_path.resolve()
            != stable_output.resolve()
        ):

            try:

                shutil.copy2(
                    internal_output_path,
                    stable_output,
                )

            except Exception as exc:

                raise HTTPException(
                    status_code=500,
                    detail={
                        "error": (
                            "Recovered video was created "
                            "but could not be exposed "
                            "to the frontend."
                        ),
                        "message": str(exc),
                        "source": str(
                            internal_output_path
                        ),
                        "destination": str(
                            stable_output
                        ),
                    },
                )

    # ============================================================
    # FALLBACK SEARCH
    # ============================================================

    if not stable_output.exists():

        candidates = sorted(
            video_reconstruction_service
            .recovered_dir
            .rglob("*_recovered.mp4"),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )

        if candidates:

            try:

                shutil.copy2(
                    candidates[0],
                    stable_output,
                )

            except Exception as exc:

                raise HTTPException(
                    status_code=500,
                    detail={
                        "error": (
                            "Recovered video exists but "
                            "could not be exposed."
                        ),
                        "message": str(exc),
                    },
                )

    # ============================================================
    # VERIFY OUTPUT EXISTS
    # ============================================================

    if not stable_output.exists():

        raise HTTPException(
            status_code=500,
            detail={
                "error": (
                    "Reconstruction completed but "
                    "the recovered MP4 could not "
                    "be located."
                ),
                "job_id": job_id,
            },
        )

    # ============================================================
    # UPDATE RESULT WITH PUBLIC OUTPUT PATH
    # ============================================================

    if isinstance(result, dict):

        if "recovered_video" not in result:
            result["recovered_video"] = {}

        result["recovered_video"][
            "output_path"
        ] = str(stable_output)

        result["recovered_video"][
            "frontend_url"
        ] = (
            f"/api/video-reconstruction/"
            f"{job_id}/recovered"
        )

        result["recovered_video"][
            "available"
        ] = True

        result["recovered_video"][
            "size_bytes"
        ] = stable_output.stat().st_size

    # ============================================================
    # SAVE PUBLIC JOB REPORT
    # ============================================================

    public_report = (
        video_reconstruction_service
        .reports_dir
        / f"{job_id}_video_reconstruction.json"
    )

    try:

        public_report.write_text(
            json.dumps(
                {
                    "success": True,
                    "job_id": job_id,
                    "filename": safe_name,
                    "result": result,
                },
                indent=2,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

    except Exception:
        # Report failure should not destroy a successfully
        # reconstructed video.
        pass

    # ============================================================
    # RESPONSE
    # ============================================================

    return {
        "success": True,
        "job_id": job_id,
        "filename": safe_name,
        "bytes_received": bytes_written,

        "uploaded_video": uploaded_probe,

        "result": result,

        "recovered_video": {
            "available": True,
            "path": str(
                stable_output
            ),
            "url": (
                f"/api/video-reconstruction/"
                f"{job_id}/recovered"
            ),
            "size_bytes": (
                stable_output.stat().st_size
            ),
        },
    }


# ==================================================================
# STREAM RECOVERED VIDEO
# ==================================================================

@router.get("/{job_id}/recovered")
def get_recovered_video(
    job_id: str,
):
    """
    Stream the recovered MP4 directly to the browser.
    """

    recovered_file = (
        video_reconstruction_service
        .recovered_dir
        / f"{job_id}_recovered.mp4"
    )

    if not recovered_file.exists():

        raise HTTPException(
            status_code=404,
            detail={
                "error": (
                    "Recovered video was not found."
                ),
                "job_id": job_id,
                "expected_path": str(
                    recovered_file
                ),
            },
        )

    return FileResponse(
        path=str(
            recovered_file
        ),
        media_type="video/mp4",
        filename=(
            f"RECOVERAI_{job_id}_recovered.mp4"
        ),
        headers={
            "Cache-Control": "no-cache",
            "Accept-Ranges": "bytes",
        },
    )


# ==================================================================
# GET ANALYSIS REPORT
# ==================================================================

@router.get("/{job_id}")
def get_video_analysis(
    job_id: str,
):
    """
    Retrieve the reconstruction report.
    """

    report = (
        video_reconstruction_service
        .reports_dir
        / f"{job_id}_video_reconstruction.json"
    )

    if not report.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "Video reconstruction report "
                "not found."
            ),
        )

    try:

        data = json.loads(
            report.read_text(
                encoding="utf-8"
            )
        )

        return {
            "success": True,
            "job_id": job_id,
            "result": data,
        }

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail={
                "error": (
                    "Unable to read reconstruction report."
                ),
                "message": str(exc),
            },
        )