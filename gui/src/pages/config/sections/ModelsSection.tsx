import { ModelRole } from "@smartai/config-yaml";
import { ModelDescription } from "core";
import { useContext, useState } from "react";
import Shortcut from "../../../components/gui/Shortcut";
import { useEditModel } from "../../../components/mainInput/Lump/useEditBlock";
import { Card, Divider, Toggle } from "../../../components/ui";
import { useAuth } from "../../../context/Auth";
import { IdeMessengerContext } from "../../../context/IdeMessenger";
import { AddModelForm } from "../../../forms/AddModelForm";
import { useI18n } from "../../../i18n";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { setDialogMessage, setShowDialog } from "../../../redux/slices/uiSlice";
import { updateSelectedModelByRole } from "../../../redux/thunks/updateSelectedModelByRole";
import { isJetBrains } from "../../../util";
import { ConfigHeader } from "../components/ConfigHeader";
import { ModelRoleRow } from "../components/ModelRoleRow";

const MODEL_DOCS_URLS = {
  chat: {
    learnMore: "https://docs.smart-ai.dev/ide-extensions/chat/quick-start",
    setup: "https://docs.smart-ai.dev/ide-extensions/chat/model-setup",
  },
  autocomplete: {
    learnMore:
      "https://docs.smart-ai.dev/ide-extensions/autocomplete/quick-start",
    setup: "https://docs.smart-ai.dev/ide-extensions/autocomplete/model-setup",
  },
  edit: {
    learnMore: "https://docs.smart-ai.dev/ide-extensions/edit/quick-start",
    setup: "https://docs.smart-ai.dev/ide-extensions/edit/model-setup",
  },
} as const;

export function ModelsSection() {
  const { selectedProfile } = useAuth();
  const dispatch = useAppDispatch();
  const ideMessenger = useContext(IdeMessengerContext);
  const { t } = useI18n();

  const config = useAppSelector((state) => state.config.config);
  const jetbrains = isJetBrains();
  const [showAdditionalRoles, setShowAdditionalRoles] = useState(false);

  function handleRoleUpdate(role: ModelRole, model: ModelDescription | null) {
    if (!model) {
      return;
    }

    void dispatch(
      updateSelectedModelByRole({
        role,
        selectedProfile,
        modelTitle: model.title,
      }),
    );
  }

  const handleConfigureModel = useEditModel();

  function handleAddModel() {
    const isLocal = selectedProfile?.profileType === "local";

    if (isLocal) {
      dispatch(setShowDialog(true));
      dispatch(
        setDialogMessage(
          <AddModelForm
            onDone={() => {
              dispatch(setShowDialog(false));
            }}
          />,
        ),
      );
    } else {
      void ideMessenger.request("controlPlane/openUrl", {
        path: "?type=models",
        orgSlug: undefined,
      });
    }
  }

  return (
    <div className="space-y-4">
      <ConfigHeader
        title={t("models.title")}
        onAddClick={handleAddModel}
        addButtonTooltip={t("models.addModel")}
      />

      <Card>
        <ModelRoleRow
          role="chat"
          displayName={t("models.roles.chat")}
          shortcut={
            <span className="text-2xs text-description-muted">
              (<Shortcut>{`cmd ${jetbrains ? "J" : "L"}`}</Shortcut>)
            </span>
          }
          description={
            <span>
              {t("models.chat.descriptionPrefix")} (
              <a
                href={MODEL_DOCS_URLS.chat.learnMore}
                target="_blank"
                rel="noopener noreferrer"
                className="text-inherit underline hover:brightness-125"
              >
                {t("common.learnMore")}
              </a>
              )
            </span>
          }
          models={config.modelsByRole.chat}
          selectedModel={config.selectedModelByRole.chat ?? undefined}
          onSelect={(model) => handleRoleUpdate("chat", model)}
          onConfigure={handleConfigureModel}
          setupURL={MODEL_DOCS_URLS.chat.setup}
        />

        <Divider />

        <ModelRoleRow
          role="autocomplete"
          displayName={t("models.roles.autocomplete")}
          description={
            <span>
              {t("models.autocomplete.descriptionPrefix")} (
              <a
                href={MODEL_DOCS_URLS.autocomplete.learnMore}
                target="_blank"
                rel="noopener noreferrer"
                className="text-inherit underline hover:brightness-125"
              >
                {t("common.learnMore")}
              </a>
              )
            </span>
          }
          models={config.modelsByRole.autocomplete}
          selectedModel={config.selectedModelByRole.autocomplete ?? undefined}
          onSelect={(model) => handleRoleUpdate("autocomplete", model)}
          onConfigure={handleConfigureModel}
          setupURL={MODEL_DOCS_URLS.autocomplete.setup}
        />

        {!jetbrains && (
          <>
            <Divider />
            <ModelRoleRow
              role="edit"
              displayName={t("models.roles.edit")}
              shortcut={
                <span className="text-2xs text-description-muted">
                  (<Shortcut>cmd I</Shortcut>)
                </span>
              }
              description={
                <span>
                  {t("models.edit.descriptionPrefix")} (
                  <a
                    href={MODEL_DOCS_URLS.edit.learnMore}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-inherit underline hover:brightness-125"
                  >
                    {t("common.learnMore")}
                  </a>
                  )
                </span>
              }
              models={config.modelsByRole.edit}
              selectedModel={config.selectedModelByRole.edit ?? undefined}
              onSelect={(model) => handleRoleUpdate("edit", model)}
              onConfigure={handleConfigureModel}
              setupURL={MODEL_DOCS_URLS.edit.setup}
            />
          </>
        )}
      </Card>

      <Card>
        <Toggle
          isOpen={showAdditionalRoles}
          onToggle={() => setShowAdditionalRoles(!showAdditionalRoles)}
          title={t("models.additionalRoles")}
          subtitle={t("models.additionalRolesSubtitle")}
        >
          <div className="flex flex-col">
            <ModelRoleRow
              role="apply"
              displayName={t("models.roles.apply")}
              description={t("models.apply.description")}
              models={config.modelsByRole.apply}
              selectedModel={config.selectedModelByRole.apply ?? undefined}
              onSelect={(model) => handleRoleUpdate("apply", model)}
              onConfigure={handleConfigureModel}
              setupURL="https://docs.smart-ai.dev/customize/model-roles/apply"
            />

            <Divider />

            <ModelRoleRow
              role="embed"
              displayName={t("models.roles.embed")}
              description={t("models.embed.description")}
              models={config.modelsByRole.embed}
              selectedModel={config.selectedModelByRole.embed ?? undefined}
              onSelect={(model) => handleRoleUpdate("embed", model)}
              onConfigure={handleConfigureModel}
              setupURL="https://docs.smart-ai.dev/customize/model-roles/embeddings"
            />

            <Divider />

            <ModelRoleRow
              role="rerank"
              displayName={t("models.roles.rerank")}
              description={t("models.rerank.description")}
              models={config.modelsByRole.rerank}
              selectedModel={config.selectedModelByRole.rerank ?? undefined}
              onSelect={(model) => handleRoleUpdate("rerank", model)}
              onConfigure={handleConfigureModel}
              setupURL="https://docs.smart-ai.dev/customize/model-roles/reranking"
            />
          </div>
        </Toggle>
      </Card>
    </div>
  );
}
