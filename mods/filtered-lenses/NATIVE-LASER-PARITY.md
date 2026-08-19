# Native laser parity follow-up

The filtered laser currently reproduces the core native behavior, but these
details should be cleaned up after the filtered excavation is working:

- [ ] Add the native charge-up sounds: `charge_up`, `charge_up_2`, and
  `charge_up_3`.
- [ ] Add the native tool-authorization check and denial message.
- [ ] Match the native insufficient-energy message and `ammo_empty` sound,
  including its rate limit.
- [ ] Add the small red origin light that follows the beam.
- [ ] Add the three delayed impact-light flashes emitted when charging
  completes.
- [ ] Match the native randomized playback rate for `laser_hit`.
- [ ] Review whether the custom repeated charge-cycle handling can be aligned
  more closely with the native action transitions.
- [ ] Verify that per-cell `world.excavateAtCell` calls preserve native terrain
  damage, terrain outputs, and redraw behavior. This differs intentionally from
  the native 7x7 pattern call so the selected-terrain filter can be applied.

