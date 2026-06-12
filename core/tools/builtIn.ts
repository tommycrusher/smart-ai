export enum BuiltInToolNames {
  ReadFile = "read_file",
  ReadFileRange = "read_file_range",
  EditExistingFile = "edit_existing_file",
  SingleFindAndReplace = "single_find_and_replace",
  MultiEdit = "multi_edit",
  ReadCurrentlyOpenFile = "read_currently_open_file",
  CreateNewFile = "create_new_file",
  RunTerminalCommand = "run_terminal_command",
  GrepSearch = "grep_search",
  FileGlobSearch = "file_glob_search",
  SearchWeb = "search_web",
  ViewDiff = "view_diff",
  LSTool = "ls",
  CreateRuleBlock = "create_rule_block",
  RequestRule = "request_rule",
  FetchUrlContent = "fetch_url_content",
  CodebaseTool = "codebase",
  ReadSkill = "read_skill",
  WriteFile = "write_file",
  GitStatus = "git_status",
  RunTests = "run_tests",
  ReadDiagnostics = "read_diagnostics",
  SearchRepo = "search_repo",
  SmarterpShellCommand = "smarterp_shell_command",
  SmarterpApiCall = "smarterp_api_call",
  FindModelField = "find_model_field",
  FindActionMenuRoute = "find_action_menu_route",
  SearchModuleStructure = "search_module_structure",
  OpenManifest = "open_manifest",
  OpenXmlView = "open_xml_view",

  // excluded from allTools for now
  ViewRepoMap = "view_repo_map",
  ViewSubdirectory = "view_subdirectory",
}

export const BUILT_IN_GROUP_NAME = "Built-In";

export const CLIENT_TOOLS_IMPLS = [
  BuiltInToolNames.EditExistingFile,
  BuiltInToolNames.SingleFindAndReplace,
  BuiltInToolNames.MultiEdit,
];
