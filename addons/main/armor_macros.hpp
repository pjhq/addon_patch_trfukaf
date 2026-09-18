#define PJHQ_PATCH_HELMET_ARMOR(CLASS_NAME) \
	class CLASS_NAME: ItemCore { \
		class ItemInfo: HeadgearItem { \
			class HitpointsProtectionInfo { \
				class HeadgearItem { \
					hitpointName = "HitHead"; \
					armor = 10; \
					passThrough = 0.5; \
				}; \
			}; \
		}; \
	}

#define PJHQ_PATCH_VEST_ARMOR(CLASS_NAME) \
	class CLASS_NAME: ItemCore { \
		class ItemInfo: VestItem { \
			class HitpointsProtectionInfo { \
				class Neck { \
					hitpointName = "HitNeck"; \
					armor = 5; \
					passThrough = 0.4; \
				}; \
				class Chest { \
					hitpointName = "HitChest"; \
					armor = 15; \
					passThrough = 0.2; \
				}; \
				class Diaphragm { \
					hitpointName = "HitDiaphragm"; \
					armor = 18; \
					passThrough = 0.2; \
				}; \
				class Abdomen { \
					hitpointName = "HitAbdomen"; \
					armor = 15; \
					passThrough = 0.2; \
				}; \
				class Body { \
					hitpointName = "HitBody"; \
					armor = 0; \
					passThrough = 0.2; \
				}; \
			}; \
		}; \
	}
