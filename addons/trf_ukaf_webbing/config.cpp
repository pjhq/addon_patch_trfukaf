#include "\pjhq\patch_trfukaf\addons\main\armor_macros.hpp"

class CfgPatches {
	class PJHQ_Patch_TRFUKAF_WEBBING {
		name = "PJHQ Patches - TRF UKAF Webbing";
		author = "N. Home";
		requiredVersion = 2.18;
		requiredAddons[] = {"PJHQ_Patch_TRFUKAF_Main", "TRF_UKAF_WEBBING"};
		skipWhenMissingDependencies = 1;
		units[] = {};
		weapons[] = {};
	};
};

class CfgWeapons {
	class ItemCore;
	class VestItem;

	PJHQ_PATCH_VEST_ARMOR(TRF_STV_FORDY);
	PJHQ_PATCH_VEST_ARMOR(TRF_STV_SPINK);
	PJHQ_PATCH_VEST_ARMOR(TRF_STV_WEBBING_P);
};
