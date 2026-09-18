# Damage And Armor Reference

This document explains how Arma 3 ammunition and personal armor configuration values interact, with practical examples from RHS USAF 0.5.6 and the armor values used by this patch.

The calculations are useful for comparing equipment, but they are not exact shot-to-kill predictions. Impact angle, impact velocity, hitpoint selection, dependent hitpoints, global damage, and medical mods can all change the final result.

## Core Properties

`hit`, `caliber`, vest `armor`, and `passThrough` have separate purposes:

| Property            | Purpose                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Ammo `hit`          | Base damage potential                                                                    |
| Ammo `caliber`      | Fire Geometry and RHA penetration multiplier                                             |
| Ammo `typicalSpeed` | Reference velocity used when scaling damage                                              |
| Vest `armor`        | Additional armor for the selected character hitpoint                                     |
| Vest `passThrough`  | Multiplier controlling transfer toward overall character damage                          |
| ACE `ACE_caliber`   | Physical bullet diameter for Advanced Ballistics, not the vanilla penetration multiplier |

A bullet is not tested using `ammo caliber >= vest armor`. The properties use unrelated scales.

## Vanilla Damage Model

For a kinetic bullet, the effective hit at the target is approximately:

```text
effective hit = ammo hit * impact speed / typicalSpeed
```

Only the kinetic portion of ammunition with a non-zero `explosive` value is reduced by velocity. A useful approximation for mixed ammunition is:

```text
effective hit = ammo hit * (explosive + (1 - explosive) * impact speed / typicalSpeed)
```

For a vest-protected chest, simplified local damage is:

```text
local damage = effective hit
             / (soldier armor * (base hitpoint armor + vest armor))
```

The current vanilla `CAManBase` has these relevant values:

```text
soldier armor        = 2
chest hitpoint armor = 1
chest passThrough    = 0.8
armorStructural      = 4
```

The RHS `rhsusf_spc` gives `HitChest` and `HitDiaphragm` an equipment armor value of `28`. Its simplified local armor is therefore:

```text
2 * (1 + 28) = 58
```

At `typicalSpeed`, simplified local chest damage is consequently:

```text
local chest damage = ammo hit / 58
```

This is a local-hitpoint comparison value, not an exact health loss or probability of death. Arma's final global-damage behavior does not consistently follow a known formula.

### Armor Value Scaling

Using RHS M855A1 with `hit = 9`:

| Vest armor | Effective denominator | Simplified local damage |
| ---------: | --------------------: | ----------------------: |
|          0 |                     2 |  4.500, normally capped |
|          5 |                    12 |                   0.750 |
|         10 |                    22 |                   0.409 |
|         15 |                    32 |                   0.281 |
|         18 |                    38 |                   0.237 |
|         20 |                    42 |                   0.214 |
|         24 |                    50 |                   0.180 |
|         28 |                    58 |                   0.155 |

Under vanilla damage handling, armor scales continuously. Increasing `armor` always reduces local damage, but each additional point provides a smaller relative improvement.

- Moving from `armor = 15` to `28` reduces this simplified damage from `0.281` to `0.155`.
- An `armor = 15` hitpoint takes approximately 81% more local damage than one with `armor = 28`.
- Moving from `armor = 24` to `28` reduces local damage by approximately 14%.

## Pass-Through

Equipment `passThrough` multiplies the hitpoint's base value. For the vanilla chest base of `0.8`:

| Vest pass-through | Effective chest pass-through |
| ----------------: | ---------------------------: |
|               1.0 |                         0.80 |
|               0.5 |                         0.40 |
|               0.4 |                         0.32 |
|               0.2 |                         0.16 |
|               0.1 |                         0.08 |

RHS SPC's `passThrough = 0.1` produces an effective chest multiplier of `0.08`. This patch's `passThrough = 0.2` produces `0.16`, approximately doubling the damage transferred through this path.

Changing `passThrough` does not directly change the local hitpoint damage or the bullet's penetration. It changes how much damage is transferred toward the character's overall damage.

## Caliber And Penetration

For RHA-compatible Fire Geometry, approximate penetration is:

```text
penetration in mm = impact speed * caliber * 15 / 1000
                  = impact speed * caliber * 0.015
```

For example, RHS M855A1 at its `typicalSpeed` has:

```text
960 * 0.65 * 0.015 = 9.36 mm RHA
```

Increasing ammo `caliber`:

- Increases penetration linearly.
- Does not directly increase `hit`.
- Can produce less direct damage after complete overpenetration because vanilla damage also depends on velocity lost through the geometry.
- Allows AP ammunition to behave differently even when it has a lower `hit` value.

Vest config `armor` is not an RHA thickness and is not directly compared with this penetration depth in vanilla damage handling.

## RHS USAF Ammunition

These values come from RHS USAF 0.5.6, Workshop item `843577117`, in `rhsusf_c_weapons.pbo`. The calculations assume that each projectile impacts at its configured `typicalSpeed`.

| RHS round    | `hit` | `caliber` | Typical speed | Approx. penetration | Vanilla local damage against armor 28 |
| ------------ | ----: | --------: | ------------: | ------------------: | ------------------------------------: |
| 9x19 FMJ     |  4.95 |     0.674 |           390 |             3.94 mm |                                 0.085 |
| 9x19 JHP     |  6.94 |     0.415 |           302 |             1.88 mm |                                 0.120 |
| 5.56 M855    |  9.00 |     0.440 |           949 |             6.26 mm |                                 0.155 |
| 5.56 M855A1  |  9.00 |     0.650 |           960 |             9.36 mm |                                 0.155 |
| 5.56 Mk318   |  9.55 |     0.640 |           950 |             9.12 mm |                                 0.165 |
| 5.56 Mk262   | 10.30 |     0.677 |           838 |             8.51 mm |                                 0.178 |
| 5.56 M995 AP |  8.60 |     0.869 |          1024 |            13.34 mm |                                 0.148 |
| 7.62 M80     | 11.55 |     0.450 |           838 |             5.66 mm |                                 0.199 |
| 7.62 M61 AP  | 12.55 |     0.790 |           838 |             9.93 mm |                                 0.216 |
| 7.62 M80A1   | 10.50 |     0.550 |           930 |             7.67 mm |                                 0.181 |
| 7.62 M118    | 11.55 |     0.520 |           805 |             6.28 mm |                                 0.199 |
| 7.62 M993 AP | 11.55 |     1.412 |           910 |            19.27 mm |                                 0.199 |
| .50 M33      | 25.31 |     1.025 |           838 |            12.89 mm |                                 0.436 |
| .50 Mk211    | 24.81 |     2.058 |           838 |            25.87 mm |           0.428 plus explosive damage |

The table demonstrates the difference between damage and penetration:

- M855 and M855A1 have identical `hit`, so their simplified vanilla hitpoint damage is identical. M855A1 has about 50% more penetration.
- M995 AP has less `hit` than M855 but more than twice its penetration.
- M993 AP inherits the same `hit` as M80 but has over three times its penetration.
- 9x19 JHP has more soft-target `hit` but less penetration than 9x19 FMJ.

## ACE Medical Model

ACE Medical's Alternate Armor Penetration setting is enabled by default in the checked ACE source. When enabled, ACE derives a discrete armor level from the Arma equipment armor value and assigns an approximate RHA thickness.

For torso armor, ACE uses these ranges:

| Config armor | ACE level       | Assumed RHA thickness |
| -----------: | --------------- | --------------------: |
|          0-4 | Engine handling |                  None |
|          5-9 | Level I         |                  6 mm |
|        10-13 | Level II        |                 15 mm |
|        14-17 | Level III       |                 21 mm |
|        18-21 | Level IV        |                 40 mm |
|          22+ | Level V         |                 55 mm |

ACE then calculates approximately:

```text
penetration = caliber * 0.015 * impactSpeed

ACE wound damage = hit * min(penetration / armorThickness, 1) / 10
```

The resulting value is ACE wound-handler input, not vanilla health percentage.

### ACE Results Against RHS SPC

Because `rhsusf_spc` uses `armor = 28`, ACE treats it as Level V with `55 mm` RHA-equivalent thickness, even though RHS describes the vest as "Armor Level IV".

| RHS round    | Approx. penetration | ACE wound damage against 55 mm |
| ------------ | ------------------: | -----------------------------: |
| 9x19 FMJ     |             3.94 mm |                          0.036 |
| 9x19 JHP     |             1.88 mm |                          0.024 |
| 5.56 M855    |             6.26 mm |                          0.102 |
| 5.56 M855A1  |             9.36 mm |                          0.153 |
| 5.56 Mk318   |             9.12 mm |                          0.158 |
| 5.56 Mk262   |             8.51 mm |                          0.159 |
| 5.56 M995 AP |            13.34 mm |                          0.209 |
| 7.62 M80     |             5.66 mm |                          0.119 |
| 7.62 M61 AP  |             9.93 mm |                          0.227 |
| 7.62 M80A1   |             7.67 mm |                          0.146 |
| 7.62 M118    |             6.28 mm |                          0.132 |
| 7.62 M993 AP |            19.27 mm |                          0.405 |
| .50 M33      |            12.89 mm |                          0.593 |
| .50 Mk211    |            25.87 mm |   1.168 plus explosive effects |

ACE generally turns values below approximately `0.35` into plate-impact contusions rather than penetrating velocity wounds. This makes the distinction between ball and AP ammunition more visible than the simplified vanilla `hit / armor` calculation.

### ACE Results Against TRF UKAF STV Rifleman

`TRF_STV_Rifleman` is representative of the TRF UKAF vests targeted by this patch. Before the patch, its chest, diaphragm, and abdomen protection all use `armor = 24` and `passThrough = 0.1`. ACE therefore treats each of these torso areas as Level V with `55 mm` RHA-equivalent thickness.

After the patch, protection varies by hitpoint:

| Area      | Before patch                               | After patch                                  |
| --------- | ------------------------------------------ | -------------------------------------------- |
| Chest     | Armor 24, Level V, 55 mm, pass-through 0.1 | Armor 15, Level III, 21 mm, pass-through 0.2 |
| Diaphragm | Armor 24, Level V, 55 mm, pass-through 0.1 | Armor 18, Level IV, 40 mm, pass-through 0.2  |
| Abdomen   | Armor 24, Level V, 55 mm, pass-through 0.1 | Armor 15, Level III, 21 mm, pass-through 0.2 |

The values below are ACE wound-damage inputs: a higher number means a more severe wound result and therefore less protection. The calculation is driven by the armor tier; `passThrough` is included in the headers for the complete config comparison but affects damage transfer separately.

**Key:** `A` = armor, `PT` = pass-through.

| RHS round    |        Before A: 24, PT: 0.1 | Chest/abdomen A: 15, PT: 0.2 |     Diaphragm A: 18, PT: 0.2 |
| ------------ | ---------------------------: | ---------------------------: | ---------------------------: |
| 9x19 FMJ     |                        0.035 |                        0.093 |                        0.049 |
| 9x19 JHP     |                        0.024 |                        0.062 |                        0.033 |
| 5.56 M855    |                        0.102 |                        0.268 |                        0.141 |
| 5.56 M855A1  |                        0.153 |                        0.401 |                        0.211 |
| 5.56 Mk318   |                        0.158 |                        0.415 |                        0.218 |
| 5.56 Mk262   |                        0.159 |                        0.417 |                        0.219 |
| 5.56 M995 AP |                        0.209 |                        0.546 |                        0.287 |
| 7.62 M80     |                        0.119 |                        0.311 |                        0.163 |
| 7.62 M61 AP  |                        0.227 |                        0.593 |                        0.312 |
| 7.62 M80A1   |                        0.146 |                        0.384 |                        0.201 |
| 7.62 M118    |                        0.132 |                        0.345 |                        0.181 |
| 7.62 M993 AP |                        0.405 |                        1.060 |                        0.556 |
| .50 M33      |                        0.593 |                        1.554 |                        0.816 |
| .50 Mk211    | 1.167 plus explosive effects | 2.481 plus explosive effects | 1.605 plus explosive effects |

For M855A1, the ACE wound value increases from `0.153` before the patch to `0.401` on the patched chest or abdomen and `0.211` on the patched diaphragm. The chest/abdomen result is approximately 2.6 times the original value, while the diaphragm result is approximately 1.4 times the original value.

The patch also changes torso `passThrough` from `0.1` to `0.2`. That approximately doubles the vanilla damage transferred through the same base hitpoint, independently of the ACE armor-thickness differences shown above.

### Effect Of Different Armor Values Under ACE

The following comparison uses M855A1 and M993 at their respective `typicalSpeed` values:

| Armor | Vanilla M855A1 local damage | ACE level | ACE thickness | ACE M855A1 wound damage | ACE M993 wound damage |
| ----: | --------------------------: | --------- | ------------: | ----------------------: | --------------------: |
|     0 |                       4.500 | Engine    |           N/A |         Engine handling |       Engine handling |
|     5 |                       0.750 | I         |          6 mm |                   0.900 |                 1.155 |
|    10 |                       0.409 | II        |         15 mm |                   0.562 |                 1.155 |
|    15 |                       0.281 | III       |         21 mm |                   0.401 |                 1.060 |
|    18 |                       0.237 | IV        |         40 mm |                   0.211 |                 0.556 |
|    20 |                       0.214 | IV        |         40 mm |                   0.211 |                 0.556 |
|    24 |                       0.180 | V         |         55 mm |                   0.153 |                 0.405 |
|    28 |                       0.155 | V         |         55 mm |                   0.153 |                 0.405 |

Unlike vanilla's continuous scaling, ACE gives the same penetration result to every armor value within a level. For example, `armor = 24` and `armor = 28` are both Level V under ACE.

## Effect On This Patch

The vest values in `addons/main/armor_macros.hpp` map as follows:

| Area      | Armor | ACE interpretation       | Pass-through |
| --------- | ----: | ------------------------ | -----------: |
| Neck      |     5 | Low head/neck protection |          0.4 |
| Chest     |    15 | Level III, 21 mm         |          0.2 |
| Diaphragm |    18 | Level IV, 40 mm          |          0.2 |
| Abdomen   |    15 | Level III, 21 mm         |          0.2 |
| Body      |     0 | No added armor           |          0.2 |

Practical consequences:

- The patched chest is substantially weaker than RHS SPC under both vanilla and ACE.
- The patched diaphragm is ACE Level IV, while RHS's `armor = 28` is treated as ACE Level V.
- The patch's `passThrough = 0.2` transfers approximately twice as much damage as RHS's `0.1` through the same vanilla chest hitpoint.
- Values from `22` through `28` behave differently under vanilla but identically under ACE's torso armor bucketing.
- Use torso armor from `18` through `21` when specifically targeting ACE Level IV behavior.
- Use at least `22` when targeting armor-level parity with RHS SPC under ACE.

The base `rhsusf_spc` does not apply `armor = 28` to the complete torso. It declares armor for `HitChest` and `HitDiaphragm`; its `HitBody` entry only sets `passThrough = 0.4`. Other SPC variants add different abdomen and equipment protection.

## Sources

- RHS USAF 0.5.6 `rhsusf_c_troops.pbo`, `rhsusf_vests.hpp`
- RHS USAF 0.5.6 `rhsusf_c_weapons.pbo`, `cfgAmmo.h`
- Arma 3 `characters_f.pbo`, `CAManBase`
- `docs/ACE3/addons/medical_damage/functions/fnc_getAmmoData.sqf`
- `docs/ACE3/addons/medical_damage/functions/fnc_woundsHandlerArmorPenetration.sqf`
- `docs/ACE3/addons/medical_damage/ACE_Medical_Injuries.hpp`
- [Arma 3: Damage Description](https://community.bistudio.com/wiki/Arma_3:_Damage_Description)
- [Arma 3: Soldier Protection](https://community.bistudio.com/wiki/Arma_3:_Soldier_Protection)
