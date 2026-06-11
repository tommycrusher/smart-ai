import {
  AtSymbolIcon,
  ChevronDownIcon,
  LightBulbIcon as LightBulbIconOutline,
  PaperClipIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { LightBulbIcon as LightBulbIconSolid } from "@heroicons/react/24/solid";
import { InputModifiers } from "core";
import {
  modelSupportsImages,
  modelSupportsReasoning,
} from "core/llm/autodetect";
import { memo, useContext, useRef } from "react";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { selectUseActiveFile } from "../../redux/selectors";
import { selectSelectedChatModel } from "../../redux/slices/configSlice";
import {
  setAutoCommandPolicySession,
  setHasReasoningEnabled,
} from "../../redux/slices/sessionSlice";
import {
  AutoCommandPolicy,
  clearRepoAutoCommandPolicy,
  setReasoningSetting,
  setRepoAutoCommandPolicy,
} from "../../redux/slices/uiSlice";
import { exitEdit } from "../../redux/thunks/edit";
import { getMetaKeyLabel, isMetaEquivalentKeyPressed } from "../../util";
import { ToolTip } from "../gui/Tooltip";
import ModelSelect from "../modelSelection/ModelSelect";
import { ModeSelect } from "../ModeSelect";
import {
  Button,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "../ui";
import { useFontSize } from "../ui/font";
import ContextStatus from "./ContextStatus";
import HoverItem from "./InputToolbar/HoverItem";

export interface ToolbarOptions {
  hideUseCodebase?: boolean;
  hideImageUpload?: boolean;
  hideAddContext?: boolean;
  enterText?: string;
  hideSelectModel?: boolean;
}

interface InputToolbarProps {
  onEnter?: (modifiers: InputModifiers) => void;
  onAddContextItem?: () => void;
  onClick?: () => void;
  onImageFileSelected?: (file: File) => void;
  hidden?: boolean;
  activeKey: string | null;
  toolbarOptions?: ToolbarOptions;
  disabled?: boolean;
  isMainInput?: boolean;
}

function InputToolbar(props: InputToolbarProps) {
  const dispatch = useAppDispatch();
  const ideMessenger = useContext(IdeMessengerContext);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const defaultModel = useAppSelector(selectSelectedChatModel);
  const useActiveFile = useAppSelector(selectUseActiveFile);
  const isInEdit = useAppSelector((store) => store.session.isInEdit);
  const codeToEdit = useAppSelector((store) => store.editModeState.codeToEdit);
  const hasReasoningEnabled = useAppSelector(
    (store) => store.session.hasReasoningEnabled,
  );
  const isEnterDisabled =
    props.disabled || (isInEdit && codeToEdit.length === 0);

  const supportsImages =
    defaultModel &&
    modelSupportsImages(
      defaultModel.provider,
      defaultModel.model,
      defaultModel.title,
      defaultModel.capabilities,
    );

  const supportsReasoning =
    !!defaultModel &&
    (modelSupportsReasoning(defaultModel) ||
      defaultModel.provider === "ollama" ||
      defaultModel.underlyingProviderName === "ollama");

  const repoKey = window.workspacePaths?.[0] ?? "";
  const sessionAutoCommandPolicy = useAppSelector(
    (store) => store.session.autoCommandPolicySession,
  );
  const repoAutoCommandPolicy = useAppSelector((store) =>
    repoKey ? store.ui.autoCommandPolicyByRepo[repoKey] : undefined,
  );

  const sessionPolicyValue =
    sessionAutoCommandPolicy == null ? "inherit" : sessionAutoCommandPolicy;
  const repoPolicyValue =
    repoAutoCommandPolicy == null ? "default" : repoAutoCommandPolicy;

  const sessionPolicyOptions: {
    value: "inherit" | AutoCommandPolicy;
    label: string;
  }[] = [
    { value: "inherit", label: "Inherit" },
    { value: "ask", label: "Ask" },
    { value: "safe", label: "Safe" },
    { value: "auto", label: "Auto" },
  ];

  const repoPolicyOptions: {
    value: "default" | AutoCommandPolicy;
    label: string;
  }[] = [
    { value: "default", label: "Default" },
    { value: "ask", label: "Ask" },
    { value: "safe", label: "Safe" },
    { value: "auto", label: "Auto" },
  ];

  const smallFont = useFontSize(-2);
  const tinyFont = useFontSize(-3);

  return (
    <>
      <div
        onClick={props.onClick}
        className={`find-widget-skip bg-vsc-input-background flex select-none flex-row items-center justify-between gap-1 pt-1 ${props.hidden ? "pointer-events-none h-0 cursor-default opacity-0" : "pointer-events-auto mt-2 cursor-text opacity-100"}`}
        style={{
          fontSize: smallFont,
        }}
      >
        <div className="xs:gap-1.5 flex flex-row items-center gap-1">
          {!isInEdit && (
            <ToolTip place="top" content="Select Mode">
              <HoverItem className="!p-0">
                <ModeSelect />
              </HoverItem>
            </ToolTip>
          )}
          <ToolTip place="top" content="Select Model">
            <HoverItem className="!p-0">
              <ModelSelect />
            </HoverItem>
          </ToolTip>
          <div className="text-description -mb-1 flex items-center transition-colors duration-200">
            <ToolTip place="top" content="Attach Files/Folders">
              <HoverItem
                className=""
                onClick={() => {
                  void ideMessenger.ide.runCommand(
                    "smartai.selectFilesAsContext",
                  );
                }}
              >
                <PaperClipIcon className="h-3 w-3 hover:brightness-125" />
              </HoverItem>
            </ToolTip>

            {props.toolbarOptions?.hideImageUpload ||
              (supportsImages && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept=".jpg,.jpeg,.png,.gif,.svg,.webp"
                    onChange={(e) => {
                      const files = e.target?.files ?? [];
                      for (const file of files) {
                        props.onImageFileSelected?.(file);
                      }
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  />

                  <ToolTip place="top" content="Attach Image">
                    <HoverItem className="">
                      <PhotoIcon
                        className="h-3 w-3 hover:brightness-125"
                        onClick={() => {
                          fileInputRef.current?.click();
                        }}
                      />
                    </HoverItem>
                  </ToolTip>
                </>
              ))}
            {props.toolbarOptions?.hideAddContext || (
              <ToolTip place="top" content="Attach Context">
                <HoverItem onClick={props.onAddContextItem}>
                  <AtSymbolIcon className="h-3 w-3 hover:brightness-125" />
                </HoverItem>
              </ToolTip>
            )}
            <ToolTip place="top" content="Session command policy for this chat">
              <div className="mx-0.5">
                <Listbox
                  value={sessionPolicyValue}
                  onChange={(value) => {
                    dispatch(
                      setAutoCommandPolicySession(
                        value === "inherit"
                          ? null
                          : (value as AutoCommandPolicy),
                      ),
                    );
                  }}
                >
                  <ListboxButton className="border-command-border !h-5 !min-h-0 !w-[5.25rem] justify-between px-1.5 py-0 text-[10px]">
                    <span>S:{sessionPolicyValue}</span>
                    <ChevronDownIcon className="h-2.5 w-2.5" />
                  </ListboxButton>
                  <ListboxOptions
                    className="!w-[7.5rem] !min-w-0"
                    anchor="top start"
                  >
                    {sessionPolicyOptions.map((opt) => (
                      <ListboxOption key={opt.value} value={opt.value}>
                        {opt.label}
                      </ListboxOption>
                    ))}
                  </ListboxOptions>
                </Listbox>
              </div>
            </ToolTip>

            <ToolTip
              place="top"
              content="Repo command policy for this workspace"
            >
              <div className="mx-0.5">
                <Listbox
                  value={repoPolicyValue}
                  onChange={(value) => {
                    if (!repoKey) {
                      return;
                    }
                    if (value === "default") {
                      dispatch(clearRepoAutoCommandPolicy(repoKey));
                      return;
                    }
                    dispatch(
                      setRepoAutoCommandPolicy({
                        repoKey,
                        policy: value as AutoCommandPolicy,
                      }),
                    );
                  }}
                >
                  <ListboxButton className="border-command-border !h-5 !min-h-0 !w-[5.25rem] justify-between px-1.5 py-0 text-[10px]">
                    <span>R:{repoPolicyValue}</span>
                    <ChevronDownIcon className="h-2.5 w-2.5" />
                  </ListboxButton>
                  <ListboxOptions
                    className="!w-[7.5rem] !min-w-0"
                    anchor="top start"
                  >
                    {repoPolicyOptions.map((opt) => (
                      <ListboxOption key={opt.value} value={opt.value}>
                        {opt.label}
                      </ListboxOption>
                    ))}
                  </ListboxOptions>
                </Listbox>
              </div>
            </ToolTip>

            {supportsReasoning && (
              <HoverItem
                onClick={() => {
                  dispatch(setHasReasoningEnabled(!hasReasoningEnabled));
                  if (defaultModel?.title) {
                    dispatch(
                      setReasoningSetting({
                        modelTitle: defaultModel.title,
                        enabled: !hasReasoningEnabled,
                      }),
                    );
                  }
                }}
              >
                <ToolTip
                  place="top"
                  content={
                    hasReasoningEnabled
                      ? "Disable model reasoning"
                      : "Enable model reasoning"
                  }
                >
                  {hasReasoningEnabled ? (
                    <LightBulbIconSolid className="h-3 w-3 brightness-200 hover:brightness-150" />
                  ) : (
                    <LightBulbIconOutline className="h-3 w-3 hover:brightness-150" />
                  )}
                </ToolTip>
              </HoverItem>
            )}
          </div>
        </div>

        <div
          className="text-description flex items-center gap-2 whitespace-nowrap"
          style={{
            fontSize: tinyFont,
          }}
        >
          {!isInEdit && <ContextStatus />}
          {!props.toolbarOptions?.hideUseCodebase && !isInEdit && (
            <div className="hidden transition-colors duration-200 hover:underline md:flex">
              <HoverItem
                className={
                  props.activeKey === "Meta" ||
                  props.activeKey === "Control" ||
                  props.activeKey === "Alt"
                    ? "underline"
                    : ""
                }
                onClick={(e) =>
                  props.onEnter?.({
                    useCodebase: false,
                    noContext: !useActiveFile,
                  })
                }
              >
                <ToolTip
                  place="top-end"
                  content={`${
                    useActiveFile
                      ? "Send Without Active File"
                      : "Send With Active File"
                  } (${getMetaKeyLabel()}⏎)`}
                >
                  <span>
                    {getMetaKeyLabel()}⏎{" "}
                    {useActiveFile ? "No active file" : "Active file"}
                  </span>
                </ToolTip>
              </HoverItem>
            </div>
          )}
          {isInEdit && (
            <HoverItem
              className="hidden hover:underline sm:flex"
              onClick={async () => {
                void dispatch(exitEdit({}));
                ideMessenger.post("focusEditor", undefined);
              }}
            >
              <span>
                <i>Esc</i> to exit Edit
              </span>
            </HoverItem>
          )}
          <ToolTip place="top" content="Send (⏎)">
            <Button
              variant={props.isMainInput ? "primary" : "secondary"}
              size="sm"
              data-testid="submit-input-button"
              onClick={async (e) => {
                if (props.onEnter) {
                  props.onEnter({
                    useCodebase: false,
                    noContext: useActiveFile
                      ? isMetaEquivalentKeyPressed(e as any) || e.altKey
                      : !(isMetaEquivalentKeyPressed(e as any) || e.altKey),
                  });
                }
              }}
              disabled={isEnterDisabled}
            >
              <span className="hidden md:inline">
                ⏎ {props.toolbarOptions?.enterText ?? "Enter"}
              </span>
              <span className="md:hidden">⏎</span>
            </Button>
          </ToolTip>
        </div>
      </div>
    </>
  );
}

function shallowToolbarOptionsEqual(a?: ToolbarOptions, b?: ToolbarOptions) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.hideAddContext === b.hideAddContext &&
    a.hideImageUpload === b.hideImageUpload &&
    a.hideUseCodebase === b.hideUseCodebase &&
    a.hideSelectModel === b.hideSelectModel &&
    a.enterText === b.enterText
  );
}

export default memo(
  InputToolbar,
  (prev, next) =>
    prev.hidden === next.hidden &&
    prev.disabled === next.disabled &&
    prev.isMainInput === next.isMainInput &&
    prev.activeKey === next.activeKey &&
    shallowToolbarOptionsEqual(prev.toolbarOptions, next.toolbarOptions),
);
