"""OpenCAD house — rectangular body, gable roof, door, windows, chimney."""

from components import cut_openings, make_body, make_chimney, make_roof

house = make_body()
house.union(make_roof(), name="Attach roof")
cut_openings(house)
house.union(make_chimney(), name="Attach chimney")
