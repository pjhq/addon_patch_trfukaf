#include "\pjhq\patch_trfukaf\addons\main\placeable_macros.hpp"

class CfgPatches {
	class PJHQ_Patch_TRFUKAF_ACCESSORIES {
		name = "PJHQ Patches - TRF UKAF Accessories";
		author = "N. Home";
		requiredVersion = 2.18;
		requiredAddons[] = {"PJHQ_Patch_TRFUKAF_Main", "TRF_UKAF_ACCESSORIES"};
		skipWhenMissingDependencies = 1;
		units[] = {};
		weapons[] = {};
	};
};

class CfgVehicles {
	PJHQ_HIDE_PLACEABLE(TRF_CS95_FORDY_HS_G_U_TEX);
};
