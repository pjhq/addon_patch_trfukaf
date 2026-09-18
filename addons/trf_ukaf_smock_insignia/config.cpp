#include "\pjhq\patch_trfukaf\addons\main\placeable_macros.hpp"

class CfgPatches {
	class PJHQ_Patch_TRFUKAF_SMOCK_INSIGNIA {
		name = "PJHQ Patches - TRF UKAF Smock Insignia";
		author = "N. Home";
		requiredVersion = 2.18;
		requiredAddons[] = {"PJHQ_Patch_TRFUKAF_Main", "TRF_UKAF"};
		skipWhenMissingDependencies = 1;
		units[] = {};
		weapons[] = {};
	};
};

class CfgVehicles {
	PJHQ_HIDE_PLACEABLE(TRF_SMOCK_1RIF_G_T);
	PJHQ_HIDE_PLACEABLE(TRF_SMOCK_1RIF_NG_T);
	PJHQ_HIDE_PLACEABLE(TRF_SMOCK_2PARA_G_T);
	PJHQ_HIDE_PLACEABLE(TRF_SMOCK_2PARA_NG_T);
	PJHQ_HIDE_PLACEABLE(TRF_SMOCK_3SCOTS_G_T);
	PJHQ_HIDE_PLACEABLE(TRF_SMOCK_3SCOTS_NG_T);
	PJHQ_HIDE_PLACEABLE(TRF_SMOCK_MERCIAN_G_T);
	PJHQ_HIDE_PLACEABLE(TRF_SMOCK_MERCIAN_NG_T);
	PJHQ_HIDE_PLACEABLE(TRF_SMOCK_1RY_G_T);
	PJHQ_HIDE_PLACEABLE(TRF_SMOCK_1RY_NG_T);
};
