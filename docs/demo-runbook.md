# RECOVERAI demo runbook

## Pre-demo checklist

1. Start the backend with `uvicorn app.main:app --reload --port 8000` from `backend`.
2. Confirm `GET /api/health` returns `healthy`.
3. Start the frontend from `frontend` with `npm run dev`.
4. Keep `data/benchmark/damaged/Mr (1)_damaged.pdf` available for upload.

## Five-minute judge flow

| Moment | Show | Say |
| --- | --- | --- |
| 1. Intake | New Investigation and file picker | “The original evidence is preserved; RECOVERAI creates a traceable record and SHA-256 before analysis.” |
| 2. Analysis | Six live pipeline stages | “We inspect signatures, structure, entropy, blocks and relationships. The pipeline does not claim recovered bytes yet.” |
| 3. Fragments | Fragment Relationship graph | “Edges are scored candidates based on observed offsets, type compatibility, entropy and classification—not fabricated certainty.” |
| 4. Damage map | Observed/missing/reconstructed storage bar | “This exact test input is a controlled benchmark. Its red region is documented ground truth, clearly labelled as such.” |
| 5. Evidence comparison | Original, damaged, recovered output and SHA-256 MATCH | “The only downloadable output comes from a trusted source, then we verify every recovered byte against its source hash.” |
| 6. Guardrail | Upload any unrelated file or point to no-download state | “For normal evidence, RECOVERAI says insufficient evidence rather than inventing original data.” |

## Expected controlled benchmark facts

- Original: `Mr (1)_original.pdf`, 192,071 bytes.
- Damaged input: `Mr (1)_damaged.pdf`, 187,975 bytes.
- Documented removal: bytes 90,000–94,095, a 4,096-byte range removal.
- Recovered artifact: 192,071 bytes, SHA-256 equal to the trusted original.
- Byte-level accuracy: 1.0 only when the recovered SHA-256 equals the trusted original SHA-256.

The source is `GROUND_TRUTH`; these damage facts are never framed as independent algorithmic discovery.

## Backend smoke-test sequence

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health

$investigation = Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/api/investigations/ `
  -ContentType 'application/json' `
  -Body '{"name":"Benchmark demonstration","description":"Controlled damaged PDF"}'

$upload = Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:8000/api/evidence/upload?investigation_id=$($investigation.investigation.id)" `
  -Form @{ file = Get-Item 'data/benchmark/damaged/Mr (1)_damaged.pdf' }

$id = $upload.evidence.id
Invoke-RestMethod -Method Post "http://127.0.0.1:8000/api/analysis/$id/scan"
Invoke-RestMethod "http://127.0.0.1:8000/api/analysis/$id/results"
Invoke-RestMethod "http://127.0.0.1:8000/api/analysis/$id/damage-map"
Invoke-RestMethod -Method Post "http://127.0.0.1:8000/api/reconstruction/$id"
```

Open `http://127.0.0.1:8000/api/reconstruction/{id}/download` only after the reconstruction response reports `recovered_output.available: true`.
