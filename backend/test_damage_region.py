from pathlib import Path

from app.core.database import SessionLocal
from app.services.damage_service import create_ground_truth_damage_region


EVIDENCE_ID = "36549834-e5ad-4d03-87b5-d6db4daab2ce"

METADATA_PATH = Path(
    "../data/benchmark/damaged/damage_metadata.json"
)


db = SessionLocal()

try:
    result = create_ground_truth_damage_region(
        db,
        EVIDENCE_ID,
        METADATA_PATH,
    )

    print(result)

finally:
    db.close()