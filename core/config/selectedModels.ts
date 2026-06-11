import { ModelRole } from "@smartai/config-yaml";

import { ContinueConfig, ILLM } from "..";
import { autoSelectModelsForAllRoles } from "../llm/autoRouter";
import { LLMConfigurationStatuses } from "../llm/constants";
import {
  GlobalContext,
  GlobalContextModelSelections,
} from "../util/GlobalContext";

export function rectifySelectedModelsFromGlobalContext(
  continueConfig: ContinueConfig,
  profileId: string,
): ContinueConfig {
  const configCopy = { ...continueConfig };

  const globalContext = new GlobalContext();
  const currentSelectedModels = globalContext.get("selectedModelsByProfileId");
  const currentForProfile: GlobalContextModelSelections =
    currentSelectedModels?.[profileId] ?? {};

  const autoSelection = globalContext.getAutoModelSelection(profileId);

  // Auto mode: pick the best model for every role from the selected pool.
  if (autoSelection.enabled) {
    const autoSelected = autoSelectModelsForAllRoles(
      continueConfig.modelsByRole as Record<string, ILLM[]>,
      autoSelection.pool,
    );

    for (const role of Object.keys(
      configCopy.selectedModelByRole,
    ) as ModelRole[]) {
      const picked = autoSelected[role] ?? null;
      if (
        role === "apply" &&
        picked?.getConfigurationStatus() !== LLMConfigurationStatuses.VALID
      ) {
        continue;
      }
      configCopy.selectedModelByRole[role] = picked;
    }

    // Keep profile selections in sync so UI reflects auto-selected models.
    globalContext.update("selectedModelsByProfileId", {
      ...currentSelectedModels,
      [profileId]: Object.fromEntries(
        Object.entries(configCopy.selectedModelByRole).map(([key, value]) => [
          key,
          value?.title ?? null,
        ]),
      ),
    });

    return configCopy;
  }

  let fellBack = false;

  const roles = Object.keys(configCopy.modelsByRole) as ModelRole[];

  for (const role of roles) {
    let newModel: ILLM | null = null;
    const currentSelection = currentForProfile[role] ?? null;

    if (currentSelection) {
      const match = continueConfig.modelsByRole[role].find(
        (m) => m.title === currentSelection,
      );
      if (match) {
        newModel = match;
      }
    }

    if (!newModel && continueConfig.modelsByRole[role].length > 0) {
      newModel = continueConfig.modelsByRole[role][0];
    }

    if (!(currentSelection === (newModel?.title ?? null))) {
      fellBack = true;
    }

    // Currently only check for configuration status for apply
    if (
      role === "apply" &&
      newModel?.getConfigurationStatus() !== LLMConfigurationStatuses.VALID
    ) {
      continue;
    }

    configCopy.selectedModelByRole[role] = newModel;
  }

  // In the case shared config wasn't respected,
  // Rewrite the shared config
  if (fellBack) {
    globalContext.update("selectedModelsByProfileId", {
      ...currentSelectedModels,
      [profileId]: Object.fromEntries(
        Object.entries(configCopy.selectedModelByRole).map(([key, value]) => [
          key,
          value?.title ?? null,
        ]),
      ),
    });
  }

  return configCopy;
}
