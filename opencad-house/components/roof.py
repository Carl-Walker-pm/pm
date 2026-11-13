"""Ruled gable roof lofted from eaves rectangle to ridge."""

from opencad import Part, Sketch

from parameters import (
    BODY_DEPTH,
    BODY_HEIGHT,
    BODY_WIDTH,
    ROOF_BODY_OVERLAP,
    ROOF_OVERHANG,
    ROOF_RIDGE_WIDTH,
    ROOF_RISE,
)


def make_roof() -> Part:
    eaves_width = BODY_WIDTH + 2.0 * ROOF_OVERHANG
    eaves_depth = BODY_DEPTH + 2.0 * ROOF_OVERHANG
    eaves_z = BODY_HEIGHT - ROOF_BODY_OVERLAP
    ridge_z = BODY_HEIGHT + ROOF_RISE

    eaves = Sketch(name="Eaves profile", plane="XY", origin=(0.0, 0.0, eaves_z)).rect(
        eaves_width,
        eaves_depth,
        origin=(-eaves_width / 2.0, -eaves_depth / 2.0),
    )
    ridge = Sketch(name="Ridge profile", plane="XY", origin=(0.0, 0.0, ridge_z)).rect(
        ROOF_RIDGE_WIDTH,
        eaves_depth,
        origin=(-ROOF_RIDGE_WIDTH / 2.0, -eaves_depth / 2.0),
    )
    return Part(name="Roof").loft([eaves, ridge], ruled=True, name="Gable roof")
