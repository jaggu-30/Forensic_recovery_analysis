
from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from typing import Any

import httpx


class ComfyUIError(RuntimeError):
    pass


class ComfyUIClient:
    """Small synchronous client for the local ComfyUI server."""

    def __init__(self, base_url: str = "http://127.0.0.1:8188", timeout: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def health(self) -> dict[str, Any]:
        with httpx.Client(timeout=self.timeout) as client:
            response = client.get(f"{self.base_url}/system_stats")
            response.raise_for_status()
            return response.json()

    def upload_image(self, path: Path, filename: str | None = None) -> dict[str, Any]:
        if not path.exists():
            raise ComfyUIError(f"Image does not exist: {path}")

        name = filename or path.name
        with httpx.Client(timeout=max(self.timeout, 120.0)) as client:
            with path.open("rb") as fh:
                response = client.post(
                    f"{self.base_url}/upload/image",
                    files={"image": (name, fh, "image/png")},
                    data={"type": "input", "overwrite": "true"},
                )
            response.raise_for_status()
            return response.json()

    def queue(self, workflow: dict[str, Any]) -> str:
        prompt_id = str(uuid.uuid4())
        payload = {
            "prompt": workflow,
            "client_id": str(uuid.uuid4()),
            "prompt_id": prompt_id,
        }

        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(f"{self.base_url}/prompt", json=payload)
            response.raise_for_status()
            data = response.json()

        if data.get("error"):
            raise ComfyUIError(str(data["error"]))

        returned = data.get("prompt_id") or prompt_id
        node_errors = data.get("node_errors") or {}
        if node_errors:
            raise ComfyUIError(f"ComfyUI node errors: {node_errors}")
        return returned

    def wait_for_output(self, prompt_id: str, timeout_seconds: int = 600) -> list[dict[str, Any]]:
        deadline = time.time() + timeout_seconds

        while time.time() < deadline:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(f"{self.base_url}/history/{prompt_id}")

            if response.status_code == 200:
                history = response.json()
                entry = history.get(prompt_id)
                if entry:
                    status = entry.get("status") or {}
                    if status.get("status_str") == "error":
                        raise ComfyUIError(
                            json.dumps(status.get("messages") or status, indent=2)
                        )

                    outputs = entry.get("outputs") or {}
                    images: list[dict[str, Any]] = []
                    for node_output in outputs.values():
                        for image in node_output.get("images", []):
                            images.append(image)

                    if images:
                        return images

            time.sleep(1.0)

        raise ComfyUIError("ComfyUI reconstruction timed out.")

    def download_output(self, image: dict[str, Any], destination: Path) -> Path:
        destination.parent.mkdir(parents=True, exist_ok=True)

        params = {
            "filename": image.get("filename", ""),
            "subfolder": image.get("subfolder", ""),
            "type": image.get("type", "output"),
        }

        with httpx.Client(timeout=max(self.timeout, 120.0)) as client:
            response = client.get(f"{self.base_url}/view", params=params)
            response.raise_for_status()

        destination.write_bytes(response.content)
        return destination
