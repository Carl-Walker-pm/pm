"""Rectangular house body sitting on the XY plane."""

from opencad import Part

from parameters import BODY_DEPTH, BODY_HEIGHT, BODY_WIDTH


def make_body() -> Part:
    body = Part(name="Body").box(BODY_WIDTH, BODY_DEPTH, BODY_HEIGHT, name="Body blank")
    body.translate((0.0, 0.0, BODY_HEIGHT / 2.0), name="Raise body onto ground plane")
    return body
