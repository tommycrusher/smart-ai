import { Tool, ToolCallState } from "core";
import Mustache from "mustache";
import { useAppSelector } from "../../../redux/hooks";
import { getStatusIntro } from "./utils";

interface ToolCallStatusMessageProps {
  tool: Tool | undefined;
  toolCallState: ToolCallState;
}

export function ToolCallStatusMessage({
  tool,
  toolCallState,
}: ToolCallStatusMessageProps) {
  const autoApprovalSource = useAppSelector(
    (store) =>
      store.session.toolCallAutoApprovalSourceById[toolCallState.toolCallId],
  );

  if (!tool) return "Agent tool use";

  const toolName = tool.displayTitle ?? tool.function.name;
  const defaultToolDescription = `${toolName} tool`;

  const futureMessage: string = tool.wouldLikeTo
    ? Mustache.render(tool.wouldLikeTo, toolCallState.parsedArgs)
    : `use the ${defaultToolDescription}`;
  // TODO go back and replace arg string values and tool names with <code> tags
  // to make them more readable

  let intro = getStatusIntro(toolCallState.status, tool.isInstant);
  let message = "";

  // Handle the special case for "done" status or instant tools that are calling
  if (
    toolCallState.status === "done" ||
    (tool.isInstant && toolCallState.status === "calling")
  ) {
    message = tool.hasAlready
      ? Mustache.render(tool.hasAlready, toolCallState.parsedArgs)
      : `used the ${defaultToolDescription}`;
  } else {
    switch (toolCallState.status) {
      case "generating":
      case "generated":
      case "canceled":
      case "errored":
        message = futureMessage;
        break;
      case "calling":
        message = tool.isCurrently
          ? Mustache.render(tool.isCurrently, toolCallState.parsedArgs)
          : `calling the ${defaultToolDescription}`;
        break;
      default:
        message = defaultToolDescription;
    }
  }

  const autoApprovalBadgeLabel = autoApprovalSource
    ? `AUTO:${autoApprovalSource.toUpperCase()}`
    : "";

  const autoApprovalBadgeClassName =
    autoApprovalSource === "session"
      ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
      : "border-violet-500/40 bg-violet-500/10 text-violet-300";

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <div
        className="text-description line-clamp-4 min-w-0 break-words"
        data-testid="tool-call-title"
      >
        {`Smart AI ${intro} ${message}`}
      </div>
      {autoApprovalSource && (
        <span
          className={`rounded-full border px-1.5 py-0.5 text-[10px] ${autoApprovalBadgeClassName}`}
          data-testid="tool-call-auto-approval-source"
          title={`Auto-approved by ${autoApprovalSource} policy`}
        >
          {autoApprovalBadgeLabel}
        </span>
      )}
    </div>
  );
}
