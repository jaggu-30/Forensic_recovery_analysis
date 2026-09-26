from sqlalchemy import Column, ForeignKey, Integer, String

from app.core.database import Base


class DamageRegion(Base):

    __tablename__ = "damage_regions"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    evidence_id = Column(
        String(100),
        ForeignKey("evidence.id"),
        index=True,
        nullable=False,
    )

    region_id = Column(
        String(100),
        index=True,
        nullable=False,
    )

    original_offset = Column(
        Integer,
        nullable=False,
    )

    size = Column(
        Integer,
        nullable=False,
    )

    original_end_offset = Column(
        Integer,
        nullable=False,
    )

    damage_type = Column(
        String(100),
        nullable=False,
    )

    recovery_status = Column(
        String(100),
        nullable=False,
    )

    source = Column(
        String(50),
        nullable=False,
    )