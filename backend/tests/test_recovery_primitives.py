"""Regression checks for verifiable recovery primitives.

Run from ``backend`` with:
    py -3.12 -m unittest discover -s tests -v
"""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from app.recovery.integrity import validate_file_structure
from app.recovery.feasibility import analyze_recovery_feasibility
from app.services.reconstruction_service import determine_reconstruction_status


class IntegrityValidationTests(unittest.TestCase):
    def test_zip_with_comment_has_valid_eocd(self) -> None:
        """A valid ZIP can have bytes after its EOCD marker as a file comment."""

        with tempfile.TemporaryDirectory() as temporary_directory:
            zip_path = Path(temporary_directory) / "commented.zip"
            with ZipFile(zip_path, "w", ZIP_DEFLATED) as archive:
                archive.writestr("evidence.txt", "RECOVERAI")
                archive.comment = b"controlled test comment"

            validation = validate_file_structure(zip_path, "ZIP_CONTAINER")

        self.assertTrue(validation["header_valid"])
        self.assertTrue(validation["footer_valid"])
        self.assertTrue(validation["valid"])
        self.assertIn("ZIP_EOCD_VALID", validation["checks"])

    def test_unknown_structure_without_a_measured_gap_is_not_recovery(self) -> None:
        """Full observed coverage alone cannot justify a recovery claim."""

        feasibility = analyze_recovery_feasibility(
            observed_bytes=1024,
            missing_bytes=0,
            structural_valid=False,
            structural_confidence=0.2,
            fragment_count=1,
        )

        self.assertEqual(feasibility["feasibility"], "INSUFFICIENT EVIDENCE")
        self.assertEqual(
            determine_reconstruction_status(
                feasibility="HIGH",
                structural_valid=True,
                missing_bytes=0,
            ),
            "NO RECOVERY REQUIRED",
        )


if __name__ == "__main__":
    unittest.main()
