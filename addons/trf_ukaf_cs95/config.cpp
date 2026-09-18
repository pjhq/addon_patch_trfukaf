#include "\pjhq\patch_trfukaf\addons\main\placeable_macros.hpp"

class CfgPatches {
	class PJHQ_Patch_TRFUKAF_CS95 {
		name = "PJHQ Patches - TRF UKAF CS95";
		author = "N. Home";
		requiredVersion = 2.18;
		requiredAddons[] = {"PJHQ_Patch_TRFUKAF_Main", "TRF_UKAF"};
		skipWhenMissingDependencies = 1;
		units[] = {};
		weapons[] = {};
	};
};

class CfgVehicles {
	class B_Soldier_base_F;

	PJHQ_HIDE_PLACEABLE(TRF_SMOCK_G_T);
	PJHQ_HIDE_PLACEABLE(TRF_SMOCK_NG_T);
	PJHQ_HIDE_PLACEABLE(TRF_CS95_FS_NG_T);
	PJHQ_HIDE_PLACEABLE(TRF_CS95_FS_G_T);
	PJHQ_HIDE_PLACEABLE(TRF_CS95_HS_NG_T);
	PJHQ_HIDE_PLACEABLE(TRF_CS95_HS_G_T);
	PJHQ_HIDE_PLACEABLE(TRF_CS95_RS_NG_T);
	PJHQ_HIDE_PLACEABLE(TRF_CS95_RS_G_T);
};
