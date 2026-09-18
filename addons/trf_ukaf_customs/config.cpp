#include "\pjhq\patch_trfukaf\addons\main\armor_macros.hpp"
#include "\pjhq\patch_trfukaf\addons\main\placeable_macros.hpp"

class CfgPatches {
	class PJHQ_Patch_TRFUKAF_CUSTOMS {
		name = "PJHQ Patches - TRF UKAF Customs";
		author = "N. Home";
		requiredVersion = 2.18;
		requiredAddons[] = {"PJHQ_Patch_TRFUKAF_Main", "TRF_UKAF_CUSTOM"};
		skipWhenMissingDependencies = 1;
		units[] = {};
		weapons[] = {};
	};
};

class CfgWeapons {
	class ItemCore;
	class HeadgearItem;
	class VestItem;

	PJHQ_PATCH_HELMET_ARMOR(TRF_BATLSKIN_REVISION_PRSN);
	PJHQ_PATCH_HELMET_ARMOR(TRF_BATLSKIN_REVISION_STRIP_SCRIM);
	PJHQ_PATCH_HELMET_ARMOR(TRF_BATLSKIN_REVISION_CREW_MANDIBLE);
	PJHQ_PATCH_HELMET_ARMOR(TRF_BATLSKIN_REVISION_CREW_MANDIBLE_SCRIM);

	PJHQ_PATCH_VEST_ARMOR(TRF_STV_Pilot);
	PJHQ_PATCH_VEST_ARMOR(TRF_STV_SIGNALLER);
};

class CfgVehicles {
	class B_Soldier_base_F;

	PJHQ_HIDE_PLACEABLE(TRF_SNOW_COVERALLS_TEX);
};
