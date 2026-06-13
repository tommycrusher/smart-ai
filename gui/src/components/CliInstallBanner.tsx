import { CommandLineIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useContext, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { getPlatform } from "../util";
import { getLocalStorage, setLocalStorage } from "../util/localStorage";
import { CloseButton } from ".";
import { IdeMessengerContext } from "../context/IdeMessenger";
import useCopy from "../hooks/useCopy";
import { CopyButton } from "./StyledMarkdownPreview/StepContainerPreToolbar/CopyButton";
import { RunInTerminalButton } from "./StyledMarkdownPreview/StepContainerPreToolbar/RunInTerminalButton";
import { Card } from "./ui";

interface CliInstallBannerProps {
  sessionCount?: number;
  sessionThreshold?: number;
  permanentDismissal?: boolean;
}

export function CliInstallBanner({
  sessionCount,
  sessionThreshold,
  permanentDismissal = false,
}: CliInstallBannerProps = {}) {
  const ideMessenger = useContext(IdeMessengerContext);
  const { t } = useI18n();
  const [cliInstalled, setCliInstalled] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const commandTextRef = useRef<HTMLSpanElement>(null);
  const { copyText } = useCopy("npm i -g @smartai/cli");
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);

  const handleCommandClick = () => {
    if (commandTextRef.current) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(commandTextRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    copyText();

    setShowCopiedMessage(true);
    setTimeout(() => setShowCopiedMessage(false), 3000);
  };

  useEffect(() => {
    if (permanentDismissal) {
      const hasDismissed = getLocalStorage("hasDismissedCliInstallBanner");
      if (hasDismissed) {
        setDismissed(true);
        return;
      }
    }

    const checkCliInstallation = async () => {
      try {
        const platform = getPlatform();
        const command = platform === "windows" ? "where cn" : "which cn";
        const [stdout, stderr] = await ideMessenger.ide.subprocess(command);
        const isInstalled =
          stdout.trim().length > 0 && !stderr.includes("not found");
        setCliInstalled(isInstalled);
      } catch (error) {
        setCliInstalled(false);
      }
    };

    void checkCliInstallation();
  }, [ideMessenger, permanentDismissal]);

  const handleDismiss = () => {
    setDismissed(true);
    if (permanentDismissal) {
      setLocalStorage("hasDismissedCliInstallBanner", true);
    }
  };

  if (
    cliInstalled === null ||
    cliInstalled === true ||
    dismissed ||
    (sessionThreshold !== undefined &&
      (sessionCount === undefined || sessionCount < sessionThreshold))
  ) {
    return null;
  }

  return (
    <div className="border-t-vsc-input-border bg-vsc-background sticky bottom-0 border-t px-4 pb-4 pt-4">
      <Card className="relative">
        <CloseButton onClick={handleDismiss}>
          <XMarkIcon className="h-5 w-5 hover:brightness-125" />
        </CloseButton>
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-foreground flex items-center gap-2 font-medium">
              <CommandLineIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
              {t("cli.installTitle")}
            </div>
            <div className="text-description mt-1 text-sm">
              {t("cli.installBody", { command: "cn" })}{" "}
              <span
                onClick={() =>
                  ideMessenger.post(
                    "openUrl",
                    "https://docs.smart-ai.dev/guides/cli",
                  )
                }
                className="cursor-pointer underline hover:brightness-125"
              >
                {t("cli.learnMore")}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 self-stretch">
            <div className="rounded-default outline-command-border flex items-center self-stretch outline outline-1">
              <div className="bg-editor rounded-l-default relative flex-1 px-3 py-3">
                <span
                  ref={commandTextRef}
                  className="text-foreground cursor-pointer text-xs"
                  style={{ fontFamily: "var(--vscode-editor-font-family)" }}
                  onClick={handleCommandClick}
                >
                  npm i -g @smartai/cli
                </span>
                {showCopiedMessage && (
                  <span className="bg-editor rounded-l-default absolute inset-0 flex items-center justify-center px-2 text-xs font-medium">
                    {t("cli.copied")}
                  </span>
                )}
              </div>
              <div className="bg-background rounded-r-default flex items-center gap-2 px-3 py-3">
                <CopyButton
                  text={`npm i -g @smartai/cli && cn "Explore this repo and provide a concise summary of it's contents"`}
                />
                <RunInTerminalButton
                  command={`npm i -g @smartai/cli && cn "Explore this repo and provide a concise summary of it's contents"`}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
