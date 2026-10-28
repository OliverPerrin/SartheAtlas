# Persistent cockpit and lift layers

These are genuine application captures, with the engine teardown from the
preceding PR present. Geometry and packaging remain illustrative; these are
not manufacturer service drawings or independently removable OEM panels.

- `ferrari-cockpit-before.png`: original cockpit preset before this layer work.
- `ferrari-cockpit-lifted.png`: final cabin preset at the Cabin stop, bodywork
  removed; tub, upholstery, harness, controls, pedal box and service equipment
  remain together above the chassis.
- `ferrari-lifted-overview.png`: the same persistent cabin in the three-quarter
  view, with the surrounding mechanical modules visible.
- `296-powertrain.png` and `porsche-powertrain.png`: revised default inspection
  angles, housings open and bodywork/wheels removed.
- `ferrari-pedals-{assembled,cabin,lowered-cooling}.png`: independent reviewer's
  settled runtime captures after the prototype footwell-camera fix. The last
  frame follows Cabin → Cooling in the same session.

The cockpit comparison uses different camera poses because reframing is part
of the change. Cockpit/powertrain captures are 1440×900; the independent pedal
captures are 1280×800. The unchanged cockpit/powertrain views were captured on
the implementation before the pedal-only fix; pedal captures cover source
commit `4f6a95b45aa9331bce13178c5b9857f5231631e5`.

The stage mapping is shared by the controls, part travel and inspection
cameras. Bodywork lifts first; fan/shroud peel occupies 0.25–0.375; radiator
travel follows at 0.375–0.5; cabin/driveline rise at 0.5–0.7; structure follows
at 0.75–0.94. Engine covers retain the preceding PR's 0.5–0.75 local teardown.
The shell moves farther overhead during cooling so it clears the inner views.

Validation: 91 tests, lint (nine existing fast-refresh warnings), production
build and startup budget pass. Independent review approved after two rounds:
prototype Pedals framing now stays inside the opaque tub. A ray sweep across
1,001 lift values per prototype found no chassis-wall/rail obstruction in the
fixed pose. Fresh reviewer runtime coverage was Ferrari, including reversal;
that is not a live certification of all 18 cars. Mobile powertrain framing can
still crop the engine, and shared family geometry remains approximate.
