from app.recovery.feasibility import (
    analyze_recovery_feasibility,
)


result = analyze_recovery_feasibility(
    observed_bytes=187975,
    missing_bytes=4096,
    structural_valid=True,
    structural_confidence=0.95,
    fragment_count=46,
    missing_regions=[
        {
            "region_id": "DAMAGE-90000-94095",
            "offset": 90000,
            "size": 4096,
            "damage_type": "BYTE_RANGE_REMOVAL",
            "source": "GROUND_TRUTH",
        }
    ],
)


print("\n========== RECOVERY FEASIBILITY ==========\n")

for key, value in result.items():
    print(f"{key}: {value}")