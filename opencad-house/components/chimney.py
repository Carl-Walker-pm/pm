"""Simple rectangular chimney on the right rear roof slope."""

from opencad import Part

from parameters import (
    CHIMNEY_BASE_Z,
    CHIMNEY_HEIGHT,
    CHIMNEY_OFFSET_X,
    CHIMNEY_OFFSET_Y,
    CHIMNEY_SIZE,
)


def make_chimney() -> Part:
    chimney = Part(name="Chimney").box(
        CHIMNEY_SIZE, CHIMNEY_SIZE, CHIMNEY_HEIGHT, name="Chimney blank"
    )
    chimney.translate(
        (CHIMNEY_OFFSET_X, CHIMNEY_OFFSET_Y, CHIMNEY_BASE_Z + CHIMNEY_HEIGHT / 2.0),
        name="Place chimney",
    )
    return chimney
