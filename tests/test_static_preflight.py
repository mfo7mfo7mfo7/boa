import subprocess
from pathlib import Path


def test_static_preflight_passes():
    """Frontend static preflight checks must pass."""
    script = Path(__file__).resolve().parents[1] / "scripts" / "static_preflight.py"
    result = subprocess.run(["python3", str(script)], capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr
