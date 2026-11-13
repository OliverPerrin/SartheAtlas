"""Builds car exteriors as plain GLB files for pack.mjs to compress.

Blender -b -P tools/blender/build.py -- [ids...] [--render DIR] [--out DIR] [--no-export]
Use `npm run models:build`, which runs this and then packs into public/models.
"""
import importlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import carlib  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def option(name, default=None):
    if name in args:
        i = args.index(name)
        value = args[i + 1]
        del args[i : i + 2]
        return value
    return default


render_dir = option("--render")
out_dir = option("--out", os.path.join(HERE, ".build"))
export = "--no-export" not in args
ids = [a for a in args if not a.startswith("--")]
if not ids:
    ids = sorted(f[:-3] for f in os.listdir(os.path.join(HERE, "cars")) if f.endswith(".py") and not f.startswith("_"))

for car_id in ids:
    importlib.reload(carlib)
    module = importlib.import_module(f"cars.{car_id}")
    # The full mesh, then a lighter one for cars seen from the air.
    for levels, suffix in ((2, ""), (1, ".lod")):
        carlib.reset()
        car = carlib.Car(module.SPEC)
        car.build_shell(levels=levels)
        module.details(car)
        carlib.set_paint(module.SPEC.get("preview_paint", (0.7, 0.7, 0.7)))
        if render_dir and not suffix:
            module.preview(car)
            carlib.render(car, os.path.join(render_dir, car_id))
        if export:
            os.makedirs(out_dir, exist_ok=True)
            carlib.export(car, os.path.join(out_dir, f"{module.SPEC['file']}{suffix}.glb"))
        else:
            break
    print(f"BUILT {car_id}")
