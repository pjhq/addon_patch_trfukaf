[h1]PJHQ Patch - TRF UKAF[/h1]
A config-only compatibility and balance patch for TRF UKAF. It normalizes armor protection and cleans soldier gear proxy classes out of Eden and Zeus placement.

[h1]Summary[/h1]
[list]
[*]Rebalances 13 helmets and 24 vests.
[*]Hides 103 unique classes from Eden/Zeus placement (121 component declarations, including 18 overlapping PCS proxy declarations).
[*]Leaves scopeArsenal unchanged, so source gear remains available in the Arsenal.
[*]Changes config values only; no models, textures, sounds, scripts or event handlers are replaced.
[/list]

[h1]Requirements And Loading[/h1]
[list]
[*]Arma 3 version 2.18 or newer.
[*]TRF UKAF and whichever TRF UKAF optional components you use.
[*]Load this patch after TRF UKAF.
[*]Patch components whose declared source dependency is missing are skipped.
[/list]

[h1]Exact Value Changes[/h1]
[h2]Helmet Protection[/h2]
[code]
Head.armor: 24 -> 10
Head.passThrough: 0.1 -> 0.5
[/code]

[h2]Vest Protection[/h2]
[code]
Neck.armor: inherited/unavailable -> 5
Neck.passThrough: inherited/unavailable -> 0.4
Chest.armor: 24 -> 15
Chest.passThrough: 0.1 -> 0.2
Diaphragm.armor: 24 -> 18
Diaphragm.passThrough: 0.1 -> 0.2
Abdomen.armor: 24 -> 15
Abdomen.passThrough: 0.1 -> 0.2
Body.armor: 24 -> 0
Body.passThrough: 0.1 -> 0.2
[/code]

The source vests did not declare a Neck block. This patch adds one; inherited pre-patch Neck values are unavailable and are not guessed.

[h2]Eden And Zeus Visibility[/h2]
[code]
All target classes.scope: 2 -> 1
103 target classes.scopeCurator: 2 -> 0
[/code]

[h1]Complete Patch List[/h1]
[h2]TRF Pilot[/h2]
[b]Hidden from Eden/Zeus placement (5)[/b]
[code]
TRF_FLIGHTSUIT_BLANK_TEX
TRF_FLIGHTSUIT_18SQN_TEX
TRF_FLIGHTSUIT_617SQN_TEX
TRF_FLIGHTSUIT_656SQN_TEX
TRF_FLIGHTSUIT_814SQN_TEX
[/code]

[h2]TRF UKAF[/h2]
[b]Helmet armor (8)[/b]
[code]
TRF_BATLSKIN_REVISION_UN
TRF_BATLSKIN_REVISION_CREW
TRF_BATLSKIN_REVISION_CREW_SCRIM
TRF_BATLSKIN_REVISION
TRF_BATLSKIN_REVISION_IR
TRF_BATLSKIN_REVISION_NETTING
TRF_BATLSKIN_REVISION_NETTING_IR
TRF_BATLSKIN_REVISION_SCRIM_OAK
[/code]

[b]Vest armor (11)[/b]
[code]
TRF_STV_Grenadier
TRF_STV_Medic
TRF_STV_Gunner
TRF_STV_Sharpshooter
TRF_STV_Crew
TRF_STV_Rifleman
TRF_STV_Rifleman_2
TRF_STV_Rifleman_3
TRF_STV_IC
TRF_STV_IC_2
TRF_STV_IC_3
[/code]

[b]Hidden from Eden/Zeus placement (6)[/b]
[code]
TRF_PCS_FS_NG_U_TEX
TRF_PCS_FS_G_U_TEX
TRF_PCS_HS_NG_U_TEX
TRF_PCS_HS_G_U_TEX
TRF_PCS_RS_NG_U_TEX
TRF_PCS_RS_G_U_TEX
[/code]

[h2]TRF UKAF Accessories[/h2]
[b]Hidden from Eden/Zeus placement (1)[/b]
[code]
TRF_CS95_FORDY_HS_G_U_TEX
[/code]

[h2]TRF UKAF CS95[/h2]
[b]Hidden from Eden/Zeus placement (8)[/b]
[code]
TRF_SMOCK_G_T
TRF_SMOCK_NG_T
TRF_CS95_FS_NG_T
TRF_CS95_FS_G_T
TRF_CS95_HS_NG_T
TRF_CS95_HS_G_T
TRF_CS95_RS_NG_T
TRF_CS95_RS_G_T
[/code]

[h2]TRF UKAF CS95 Insignia[/h2]
[b]Hidden from Eden/Zeus placement (30)[/b]
[code]
TRF_CS95_1RIF_FS_NG_U_TEX
TRF_CS95_1RIF_FS_G_U_TEX
TRF_CS95_1RIF_HS_NG_U_TEX
TRF_CS95_1RIF_HS_G_U_TEX
TRF_CS95_1RIF_RS_NG_U_TEX
TRF_CS95_1RIF_RS_G_U_TEX
TRF_CS95_2PARA_FS_NG_U_TEX
TRF_CS95_2PARA_FS_G_U_TEX
TRF_CS95_2PARA_HS_NG_U_TEX
TRF_CS95_2PARA_HS_G_U_TEX
TRF_CS95_2PARA_RS_NG_U_TEX
TRF_CS95_2PARA_RS_G_U_TEX
TRF_CS95_3SCOTS_FS_NG_U_TEX
TRF_CS95_3SCOTS_FS_G_U_TEX
TRF_CS95_3SCOTS_HS_NG_U_TEX
TRF_CS95_3SCOTS_HS_G_U_TEX
TRF_CS95_3SCOTS_RS_NG_U_TEX
TRF_CS95_3SCOTS_RS_G_U_TEX
TRF_CS95_MERCIAN_FS_NG_U_TEX
TRF_CS95_MERCIAN_FS_G_U_TEX
TRF_CS95_MERCIAN_HS_NG_U_TEX
TRF_CS95_MERCIAN_HS_G_U_TEX
TRF_CS95_MERCIAN_RS_NG_U_TEX
TRF_CS95_MERCIAN_RS_G_U_TEX
TRF_CS95_1RY_FS_NG_U_TEX
TRF_CS95_1RY_FS_G_U_TEX
TRF_CS95_1RY_HS_NG_U_TEX
TRF_CS95_1RY_HS_G_U_TEX
TRF_CS95_1RY_RS_NG_U_TEX
TRF_CS95_1RY_RS_G_U_TEX
[/code]

[h2]TRF UKAF Customs[/h2]
[b]Helmet armor (4)[/b]
[code]
TRF_BATLSKIN_REVISION_PRSN
TRF_BATLSKIN_REVISION_STRIP_SCRIM
TRF_BATLSKIN_REVISION_CREW_MANDIBLE
TRF_BATLSKIN_REVISION_CREW_MANDIBLE_SCRIM
[/code]

[b]Vest armor (2)[/b]
[code]
TRF_STV_Pilot
TRF_STV_SIGNALLER
[/code]

[b]Hidden from Eden/Zeus placement (1)[/b]
[code]
TRF_SNOW_COVERALLS_TEX
[/code]

[h2]TRF UKAF Insignia[/h2]
[b]Hidden from Eden/Zeus placement (18)[/b]
[code]
TRF_PCS_1RIF_FS_NG_U_TEX
TRF_PCS_1RIF_FS_G_U_TEX
TRF_PCS_1RIF_HS_NG_U_TEX
TRF_PCS_1RIF_HS_G_U_TEX
TRF_PCS_1RIF_RS_NG_U_TEX
TRF_PCS_1RIF_RS_G_U_TEX
TRF_PCS_2PARA_FS_NG_U_TEX
TRF_PCS_2PARA_FS_G_U_TEX
TRF_PCS_2PARA_HS_NG_U_TEX
TRF_PCS_2PARA_HS_G_U_TEX
TRF_PCS_2PARA_RS_NG_U_TEX
TRF_PCS_2PARA_RS_G_U_TEX
TRF_PCS_3SCOTS_FS_NG_U_TEX
TRF_PCS_3SCOTS_FS_G_U_TEX
TRF_PCS_3SCOTS_HS_NG_U_TEX
TRF_PCS_3SCOTS_HS_G_U_TEX
TRF_PCS_3SCOTS_RS_NG_U_TEX
TRF_PCS_3SCOTS_RS_G_U_TEX
[/code]

[h2]TRF UKAF PCS Insignia[/h2]
Also patches all 18 PCS classes listed under UKAF Insignia, plus:
[b]Additional hidden classes (12)[/b]
[code]
TRF_PCS_MERCIAN_FS_NG_U_TEX
TRF_PCS_MERCIAN_FS_G_U_TEX
TRF_PCS_MERCIAN_HS_NG_U_TEX
TRF_PCS_MERCIAN_HS_G_U_TEX
TRF_PCS_MERCIAN_RS_NG_U_TEX
TRF_PCS_MERCIAN_RS_G_U_TEX
TRF_PCS_1RY_FS_NG_U_TEX
TRF_PCS_1RY_FS_G_U_TEX
TRF_PCS_1RY_HS_NG_U_TEX
TRF_PCS_1RY_HS_G_U_TEX
TRF_PCS_1RY_RS_NG_U_TEX
TRF_PCS_1RY_RS_G_U_TEX
[/code]

[h2]TRF UKAF SFSG[/h2]
[b]Helmet armor (1)[/b]
[code]
TRF_FAST_SFHC
[/code]

[b]Vest armor (8)[/b]
[code]
UKAF_C2R_CBAV_SL
UKAF_C2R_CBAV_SL_2
UKAF_C2R_CBAV_MEDIC
UKAF_C2R_CBAV_MARKSMAN
UKAF_C2R_CBAV_JTAC
UKAF_C2R_CBAV_JTAC_2
UKAF_C2R_CBAV_RIFLEMAN
UKAF_C2R_CBAV_RIFLEMAN_2
[/code]

[b]Hidden from Eden/Zeus placement (12)[/b]
[code]
TRF_CRYE_G4_B_NG_FS_TEX
TRF_CRYE_G4_BLNK_NG_FS_TEX
TRF_CRYE_G4_RMC_NG_FS_TEX
TRF_CRYE_G4_B_NG_RS_TEX
TRF_CRYE_G4_BLNK_NG_RS_TEX
TRF_CRYE_G4_RMC_NG_RS_TEX
TRF_CRYE_G4_B_G_RS_TEX
TRF_CRYE_G4_BLNK_G_RS_TEX
TRF_CRYE_G4_RMC_G_RS_TEX
TRF_CRYE_G4_RNC_PCU_TEX
TRF_CRYE_G4_BLNK_PCU_TEX
TRF_CRYE_G4_RMC_PCU_TEX
[/code]

[h2]TRF UKAF Smock Insignia[/h2]
[b]Hidden from Eden/Zeus placement (10)[/b]
[code]
TRF_SMOCK_1RIF_G_T
TRF_SMOCK_1RIF_NG_T
TRF_SMOCK_2PARA_G_T
TRF_SMOCK_2PARA_NG_T
TRF_SMOCK_3SCOTS_G_T
TRF_SMOCK_3SCOTS_NG_T
TRF_SMOCK_MERCIAN_G_T
TRF_SMOCK_MERCIAN_NG_T
TRF_SMOCK_1RY_G_T
TRF_SMOCK_1RY_NG_T
[/code]

[h2]TRF UKAF Webbing[/h2]
[b]Vest armor (3)[/b]
[code]
TRF_STV_FORDY
TRF_STV_SPINK
TRF_STV_WEBBING_P
[/code]


[h1]Source And Support[/h1]
[url=https://github.com/pjhq/addon_patch_trfukaf]Source code and full README[/url]
[url=https://github.com/pjhq/addon_patch_trfukaf/issues]Report an issue[/url]
