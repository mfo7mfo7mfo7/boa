"""Boa package."""

from boa.domain import Milestone, ReleaseBlueprint
from boa.yaml_io import BlueprintValidationError, dump_release_blueprint, load_release_blueprint

__all__ = [
    "__version__",
    "BlueprintValidationError",
    "Milestone",
    "ReleaseBlueprint",
    "dump_release_blueprint",
    "load_release_blueprint",
]

__version__ = "2.0.0"
