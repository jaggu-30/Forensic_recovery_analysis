import sqlite3


DB_PATH = "recoverai.db"


db = sqlite3.connect(DB_PATH)

try:

    print("Starting fragments table migration...")

    db.execute("PRAGMA foreign_keys=OFF")

    # ---------------------------------------------------------
    # Rename existing table
    # ---------------------------------------------------------

    db.execute(
        "ALTER TABLE fragments "
        "RENAME TO fragments_old"
    )

    # ---------------------------------------------------------
    # Create corrected table
    # ---------------------------------------------------------

    db.execute(
        """
        CREATE TABLE fragments (
            id INTEGER PRIMARY KEY,
            fragment_id VARCHAR(100) NOT NULL,
            evidence_id VARCHAR(100) NOT NULL,
            offset INTEGER NOT NULL,
            size INTEGER NOT NULL,
            end_offset INTEGER NOT NULL,
            sha256 VARCHAR(64) NOT NULL,
            entropy FLOAT NOT NULL,
            probable_type VARCHAR(50) NOT NULL,
            classification VARCHAR(100) NOT NULL,
            confidence FLOAT NOT NULL,

            CONSTRAINT uq_fragment_evidence_fragment
            UNIQUE (evidence_id, fragment_id),

            FOREIGN KEY(evidence_id)
            REFERENCES evidence(id)
        )
        """
    )

    # ---------------------------------------------------------
    # Copy existing records
    # ---------------------------------------------------------

    db.execute(
        """
        INSERT INTO fragments (
            id,
            fragment_id,
            evidence_id,
            offset,
            size,
            end_offset,
            sha256,
            entropy,
            probable_type,
            classification,
            confidence
        )
        SELECT
            id,
            fragment_id,
            evidence_id,
            offset,
            size,
            end_offset,
            sha256,
            entropy,
            probable_type,
            classification,
            confidence
        FROM fragments_old
        """
    )

    # ---------------------------------------------------------
    # Remove old table
    # ---------------------------------------------------------

    db.execute(
        "DROP TABLE fragments_old"
    )

    # ---------------------------------------------------------
    # Indexes
    # ---------------------------------------------------------

    db.execute(
        "CREATE INDEX ix_fragments_id "
        "ON fragments (id)"
    )

    db.execute(
        "CREATE INDEX ix_fragments_fragment_id "
        "ON fragments (fragment_id)"
    )

    db.execute(
        "CREATE INDEX ix_fragments_evidence_id "
        "ON fragments (evidence_id)"
    )

    db.commit()

    print("Fragments table migration completed successfully.")

finally:

    db.execute("PRAGMA foreign_keys=ON")
    db.close()