"""Door and window cutters for the front (+Y) elevation."""

from opencad import Part

from parameters import (
    BODY_DEPTH,
    DOOR_CUT_DEPTH,
    DOOR_HEIGHT,
    DOOR_WIDTH,
    WINDOW_CUT_DEPTH,
    WINDOW_HEIGHT,
    WINDOW_OFFSET_X,
    WINDOW_SILL_HEIGHT,
    WINDOW_WIDTH,
)


def cut_openings(house: Part) -> Part:
    door = Part(name="Door cutter").box(
        DOOR_WIDTH, DOOR_CUT_DEPTH, DOOR_HEIGHT, name="Door blank"
    )
    door.translate((0.0, BODY_DEPTH / 2.0, DOOR_HEIGHT / 2.0), name="Place door")
    house.cut(door, name="Door opening")

    for side, label in ((-1.0, "left"), (1.0, "right")):
        window = Part(name=f"Window cutter {label}").box(
            WINDOW_WIDTH, WINDOW_CUT_DEPTH, WINDOW_HEIGHT, name=f"Window blank {label}"
        )
        window.translate(
            (
                side * WINDOW_OFFSET_X,
                BODY_DEPTH / 2.0,
                WINDOW_SILL_HEIGHT + WINDOW_HEIGHT / 2.0,
            ),
            name=f"Place window {label}",
        )
        house.cut(window, name=f"Window opening {label}")

    return house
