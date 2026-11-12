"""Color parsing/validation for silicone cases.

Any color is accepted as long as it can be parsed. The palette in data/cases.json is only a set of
suggested swatches (and a lookup for legacy palette ids such as "pink"); it is NOT a whitelist.
Everything is normalized to a lowercase '#rrggbb' string before it is stored.
"""
import json
import re
from pathlib import Path

_CASES = Path(__file__).resolve().parent.parent / "data" / "cases.json"
_HEX = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
_RGB = re.compile(r"^rgb\(\s*(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})\s*\)$", re.IGNORECASE)


def _palette() -> dict[str, str]:
    try:
        data = json.loads(_CASES.read_text(encoding="utf-8"))
        return {c["id"].lower(): c["hex"] for c in data.get("siliconeColors", [])}
    except (OSError, ValueError, KeyError, TypeError):
        return {}


def normalize_color(value) -> str | None:
    """None/'' -> None. '#abc', '#aabbcc', 'rgb(1, 2, 3)' or a legacy palette id -> '#rrggbb'. Otherwise ValueError."""
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("Color must be text, e.g. #FF7FBD or rgb(255, 127, 189).")
    v = value.strip()
    if not v:
        return None

    if v.startswith("#"):
        m = _HEX.match(v)
        if not m:
            raise ValueError("Invalid HEX color. Use #RGB or #RRGGBB.")
        h = m.group(1).lower()
        if len(h) == 3:
            h = "".join(ch * 2 for ch in h)
        return f"#{h}"

    m = _RGB.match(v)
    if m:
        r, g, b = (int(x) for x in m.groups())
        if max(r, g, b) > 255:
            raise ValueError("Invalid RGB color: each channel must be between 0 and 255.")
        return f"#{r:02x}{g:02x}{b:02x}"

    legacy = _palette().get(v.lower())
    if legacy:
        return normalize_color(legacy)
    raise ValueError("Invalid color. Use a HEX value (#RRGGBB) or rgb(r, g, b).")