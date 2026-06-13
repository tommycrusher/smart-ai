import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  CubeIcon,
  DocumentIcon,
  PencilIcon,
  QuestionMarkCircleIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { ConfigSection } from "./components/ConfigSection";
import { ConfigsSection } from "./sections/ConfigsSection";
import { HelpSection } from "./sections/HelpSection";
import { IndexingSettingsSection } from "./sections/IndexingSettingsSection";
import { ModelsSection } from "./sections/ModelsSection";
import { OrganizationsSection } from "./sections/OrganizationsSection";
import { RulesSection } from "./sections/RulesSection";
import { ToolsSection } from "./sections/ToolsSection";
import { UserSettingsSection } from "./sections/UserSettingsSection";

interface TabOption {
  id: string;
  label: string;
  component: React.ReactNode;
  icon: React.ReactNode;
}

interface TabSection {
  id: string;
  tabs: TabOption[];
  showTopDivider?: boolean;
  showBottomDivider?: boolean;
  className?: string;
}

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export const getTopTabSections = (t: TranslateFn): TabSection[] => [
  {
    id: "top",
    tabs: [
      {
        id: "back",
        label: t("tabs.back"),
        component: <div />,
        icon: <ArrowLeftIcon className="xs:h-4 xs:w-4 h-3 w-3 flex-shrink-0" />,
      },
    ],
  },
  {
    id: "blocks",
    showTopDivider: true,
    tabs: [
      {
        id: "models",
        label: t("tabs.models"),
        component: (
          <ConfigSection>
            <ModelsSection />
          </ConfigSection>
        ),
        icon: <CubeIcon className="xs:h-4 xs:w-4 h-3 w-3 flex-shrink-0" />,
      },
      {
        id: "rules",
        label: t("tabs.rules"),
        component: (
          <ConfigSection>
            <RulesSection />
          </ConfigSection>
        ),
        icon: <PencilIcon className="xs:h-4 xs:w-4 h-3 w-3 flex-shrink-0" />,
      },
      {
        id: "tools",
        label: t("tabs.tools"),
        component: (
          <ConfigSection>
            <ToolsSection />
          </ConfigSection>
        ),
        icon: (
          <WrenchScrewdriverIcon className="xs:h-4 xs:w-4 h-3 w-3 flex-shrink-0" />
        ),
      },
    ],
  },
  {
    id: "agents-orgs",
    showTopDivider: true,
    tabs: [
      {
        id: "configs",
        label: t("tabs.configs"),
        component: (
          <ConfigSection>
            <ConfigsSection />
          </ConfigSection>
        ),
        icon: <DocumentIcon className="xs:h-4 xs:w-4 h-3 w-3 flex-shrink-0" />,
      },
      {
        id: "organizations",
        label: t("tabs.organizations"),
        component: (
          <ConfigSection>
            <OrganizationsSection />
          </ConfigSection>
        ),
        icon: (
          <BuildingOfficeIcon className="xs:h-4 xs:w-4 h-3 w-3 flex-shrink-0" />
        ),
      },
    ],
  },
  {
    id: "indexing",
    showTopDivider: true,
    tabs: [
      {
        id: "indexing",
        label: t("tabs.indexing"),
        component: (
          <ConfigSection>
            <IndexingSettingsSection />
          </ConfigSection>
        ),
        icon: (
          <CircleStackIcon className="xs:h-4 xs:w-4 h-3 w-3 flex-shrink-0" />
        ),
      },
    ],
  },
];

export const getBottomTabSections = (t: TranslateFn): TabSection[] => [
  {
    id: "bottom",
    tabs: [
      {
        id: "settings",
        label: t("tabs.settings"),
        component: (
          <ConfigSection>
            <UserSettingsSection />
          </ConfigSection>
        ),
        icon: <Cog6ToothIcon className="xs:h-4 xs:w-4 h-3 w-3 flex-shrink-0" />,
      },
      {
        id: "help",
        label: t("tabs.help"),
        component: (
          <ConfigSection>
            <HelpSection />
          </ConfigSection>
        ),
        icon: (
          <QuestionMarkCircleIcon className="xs:h-4 xs:w-4 h-3 w-3 flex-shrink-0" />
        ),
      },
    ],
  },
];

export const getAllTabs = (t: TranslateFn): TabOption[] => {
  return [...getTopTabSections(t), ...getBottomTabSections(t)].flatMap(
    (section) => section.tabs,
  );
};
