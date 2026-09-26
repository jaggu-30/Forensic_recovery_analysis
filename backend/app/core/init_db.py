from app.core.database import Base, engine

# Import models so SQLAlchemy knows about them.
from app.models.investigation import Investigation
from app.models.evidence import Evidence
from app.models.fragment import Fragment
from app.models.fragment_relationship import FragmentRelationship
from app.models.damage_region import DamageRegion
from app.models.reconstruction import ReconstructionCandidate


def initialize_database():
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    initialize_database()
    print("RECOVERAI database initialized successfully.")
