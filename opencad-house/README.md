# OpenCAD House

Parametric scale-model house built with the OpenCAD fluent API (OCCT backend).

## Units and assumptions

- Units: millimeters
- Scale model (not a construction drawing)
- Body sits on the XY ground plane (`Z = 0`)
- Front elevation faces `+Y`
- Gable ridge runs along `Y` (front-to-back)

## Key dimensions

| Feature | Value (mm) |
| --- | --- |
| Body width × depth × height | 100 × 80 × 60 |
| Roof rise / overhang | 35 / 6 |
| Door | 24 × 40 |
| Windows | 18 × 18 (left and right) |
| Chimney | 12 × 12 × 28 |

## Layout

```text
assembly.py              # final Part composition
parameters.py             # shared dimensions
components/
  body.py                # rectangular shell
  roof.py                # ruled loft gable
  openings.py            # door + window cuts
  chimney.py             # roof chimney
outputs/
  assembly.step          # B-rep exchange
  assembly.stl           # mesh
  assembly.tree.json     # feature history
  house-turntable.gif    # preview
```

## Build

Requires `pip install "opencad[occt]"`.

```bash
# With the create-cad-files skill helpers:
python scripts/build_cad_file.py assembly.py outputs/assembly.step \
  --tree-output outputs/assembly.tree.json --force
python scripts/build_cad_file.py assembly.py outputs/assembly.stl --force

# Or OpenCAD CLI:
opencad run assembly.py --export outputs/assembly.step --tree-output outputs/assembly.tree.json
```

## Limitations

- Visual scale model only — not for construction, permitting, or structural use
- Openings are simple through-cuts (no frames, glass, or hardware)
- Roof is a solid loft, not framed rafters
