#include "\pjhq\patch_trfukaf\addons\main\placeable_macros.hpp"

class CfgPatches {
	class PJHQ_Patch_TRFUKAF_PILOT {
		name = "PJHQ Patches - TRF Pilot";
		author = "N. Home";
		requiredVersion = 2.18;
		requiredAddons[] = {"PJHQ_Patch_TRFUKAF_Main", "TRF_PILOT"};
		skipWhenMissingDependencies = 1;
		units[] = {};
		weapons[] = {};
	};
};

class CfgVehicles {
	PJHQ_HIDE_PLACEABLE(TRF_FLIGHTSUIT_BLANK_TEX);
	PJHQ_HIDE_PLACEABLE(TRF_FLIGHTSUIT_18SQN_TEX);
	PJHQ_HIDE_PLACEABLE(TRF_FLIGHTSUIT_617SQN_TEX);
	PJHQ_HIDE_PLACEABLE(TRF_FLIGHTSUIT_656SQN_TEX);
	PJHQ_HIDE_PLACEABLE(TRF_FLIGHTSUIT_814SQN_TEX);
};
