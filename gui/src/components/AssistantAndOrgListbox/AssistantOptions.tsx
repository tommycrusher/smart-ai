import { useAuth } from "../../context/Auth";
import { useI18n } from "../../i18n";
import { AssistantOption } from "./AssistantOption";

interface AssistantOptionsProps {
  selectedProfileId: string | undefined;
  onClose: () => void;
}

export function AssistantOptions({
  selectedProfileId,
  onClose,
}: AssistantOptionsProps) {
  const { profiles } = useAuth();
  const { t } = useI18n();

  return (
    <div className="thin-scrollbar flex max-h-32 flex-col overflow-y-auto">
      {profiles?.length === 0 ? (
        <div className="text-vsc-foreground px-3 py-2 opacity-70">
          {t("assistant.noConfigFound")}
        </div>
      ) : (
        profiles?.map((profile, idx) => (
          <AssistantOption
            key={idx}
            profile={profile}
            onClick={onClose}
            selected={profile.id === selectedProfileId}
          />
        ))
      )}
    </div>
  );
}
