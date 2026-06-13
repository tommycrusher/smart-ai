export type Locale = "en" | "pl";

type TranslationValue = string | ((params?: Record<string, any>) => string);

const interpolate = (template: string, params?: Record<string, any>) => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
};

const en: Record<string, TranslationValue> = {
  "tabs.back": "Back",
  "tabs.models": "Models",
  "tabs.rules": "Rules",
  "tabs.tools": "Tools",
  "tabs.configs": "Configs",
  "tabs.organizations": "Organizations",
  "tabs.indexing": "Indexing",
  "tabs.settings": "Settings",
  "tabs.help": "Help",
  "common.loading": "Loading",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.confirm": "Confirm",
  "common.confirmation": "Confirmation",
  "common.learnMore": "Learn more",
  "history.searchPlaceholder": "Search past sessions",
  "history.loading": "Loading sessions...",
  "history.empty":
    'No past sessions found. To start a new session, either click the "+" button or use the keyboard shortcut: {shortcut}',
  "history.clearChats": "Clear chats",
  "history.savedTo": "Chat history is saved to",
  "history.clearDialogTitle": "Clear sessions",
  "history.clearDialogText":
    "Are you sure you want to permanently delete all chat sessions, including the current chat session?",
  "history.lastSession": "Last Session",
  "history.remote": "Remote",
  "history.messageCount": (params) =>
    `${params?.count} message${params?.count === 1 ? " is" : "s are"} present in this session`,
  "history.openInBrowser": "Open in browser",
  "history.edit": "Edit",
  "history.saveAsMarkdown": "Save Chat as Markdown",
  "history.delete": "Delete",
  "history.title": "Chat",
  "cli.installTitle": "Try out the Smart AI CLI",
  "cli.installBody":
    "Use {command} in your terminal interactively and then deploy Continuous AI workflows.",
  "cli.learnMore": "Learn more.",
  "cli.copied": "Copied!",
  "assistant.configs": "Configs",
  "assistant.organizations": "Organizations",
  "assistant.noConfigFound": "No config found",
  "assistant.toggleHint": "{keyCombo} to toggle config",
  "assistant.setUpConfigFile": "Set up config file",
  "assistant.loading": "Loading",
  "assistant.reload": "Reload",
  "assistant.logIn": "Log in",
  "assistant.logOut": "Log out",
  "assistant.manageAccount": "Manage Account",
  "settings.screenWidthTooSmall": "Screen width too small",
  "settings.expandSidebarHint":
    "To view settings, please expand the sidebar by dragging the left/right border",
  "settings.installOllama": "Install Ollama",
  "settings.downloadChatModel": "Download Chat model",
  "settings.downloadAutocompleteModel": "Download Autocomplete model",
  "settings.downloadEmbeddingsModel": "Download Embeddings model",
  "settings.connect": "Connect",
  "settings.skipManual": "Skip and configure manually",
  "settings.modelsAddon": "Models Add-on",
  "settings.createAccount": "Create Account",
  "settings.purchaseCredits": "Purchase Credits",
  "settings.logInHub":
    "Log in to Smart AI Hub to get started with AI-powered coding",
  "settings.logInHubButton": "Log in to Smart AI Hub",
  "settings.configureModels": "Or, configure your own models",
  "settings.accountCreated": "Account created!",
  "settings.welcome": "🎉 Welcome to Smart AI!",
  "settings.errorHandling": "Error handling model response",
  "settings.viewErrorOutput": "View error output",
  "settings.copyOutput": "Copy output",
  "settings.viewLogs": "View Logs",
  "settings.restart": "Restart",
  "settings.checkApiKey": "Check API key",
  "settings.viewConfig": "View config",
  "settings.resubmitLastMessage": "Resubmit last message",
  "settings.openHelp": "View help documentation",
  "settings.userSettings": "User Settings",
  "settings.chat": "Chat",
  "settings.telemetry": "Telemetry",
  "settings.appearance": "Appearance",
  "settings.autocomplete": "Autocomplete",
  "settings.experimental": "Experimental",
  "settings.language": "Language",
  "settings.languageEnglish": "English",
  "settings.languagePolish": "Polski",
  "models.title": "Models",
  "models.addModel": "Add model",
  "models.addChatModel": "Add Chat model",
  "models.configure": "Configure",
  "models.setupModel": "Setup {role} model",
  "models.selectModel": "Select {role} model",
  "models.selectModelShort": "Select model",
  "models.noValidModels": "No {valid}{role} models{suffix}",
  "models.fallbackChat": ". Using Chat model",
  "models.invalidConfig": "(Invalid config)",
  "models.missingEnvSecret": "(Missing env secret)",
  "models.missingApiKey": "(Missing API Key)",
  "models.roles.chat": "Chat",
  "models.roles.autocomplete": "Autocomplete",
  "models.roles.edit": "Edit",
  "models.roles.apply": "Apply",
  "models.roles.embed": "Embed",
  "models.roles.rerank": "Rerank",
  "models.chat.descriptionPrefix": "Used in Chat, Plan, and Agent mode",
  "models.autocomplete.descriptionPrefix":
    "Used in inline code completions as you type",
  "models.edit.descriptionPrefix":
    "Used to transform a selected section of code",
  "models.additionalRoles": "Additional model roles",
  "models.additionalRolesSubtitle": "Apply, Embed, Rerank",
  "models.apply.description": "Used to apply generated codeblocks to files",
  "models.embed.description":
    "Used to generate and query embeddings for the @codebase and @docs context providers",
  "models.rerank.description":
    "Used for reranking results from the @codebase and @docs context providers",
  "modelSelect.autodetected": "(autodetected)",
  "modelSelect.loadingConfig": "Loading config",
  "modelSelect.noModels": "No models configured",
  "modelSelect.autoRouter": "Auto Model Router",
  "modelSelect.enableAutoSelect": "Enable auto-select",
  "modelSelect.pool": "Pool:",
  "modelSelect.poolOllama": "Ollama (local)",
  "modelSelect.poolAnthropic": "Anthropic",
  "modelSelect.poolOpenAI": "OpenAI",
  "modelSelect.poolMixed": "Mixed (best)",
  "modelSelect.toggleHint": "{keyCombo} to toggle model",
};

const pl: Record<string, TranslationValue> = {
  "tabs.back": "Wstecz",
  "tabs.models": "Modele",
  "tabs.rules": "Reguły",
  "tabs.tools": "Narzędzia",
  "tabs.configs": "Konfiguracje",
  "tabs.organizations": "Organizacje",
  "tabs.indexing": "Indeksowanie",
  "tabs.settings": "Ustawienia",
  "tabs.help": "Pomoc",
  "common.loading": "Ładowanie",
  "common.save": "Zapisz",
  "common.cancel": "Anuluj",
  "common.confirm": "Potwierdź",
  "common.confirmation": "Potwierdzenie",
  "common.learnMore": "Dowiedz się więcej",
  "history.searchPlaceholder": "Szukaj wcześniejszych sesji",
  "history.loading": "Ładowanie sesji...",
  "history.empty":
    'Nie znaleziono wcześniejszych sesji. Aby rozpocząć nową sesję, kliknij przycisk "+" lub użyj skrótu klawiaturowego: {shortcut}',
  "history.clearChats": "Wyczyść czaty",
  "history.savedTo": "Historia czatu jest zapisywana w",
  "history.clearDialogTitle": "Wyczyść sesje",
  "history.clearDialogText":
    "Czy na pewno chcesz trwale usunąć wszystkie sesje czatu, w tym bieżącą sesję?",
  "history.lastSession": "Ostatnia sesja",
  "history.remote": "Zdalna",
  "history.messageCount": (params) =>
    `${params?.count} wiadomość${params?.count === 1 ? " jest" : "i są"} dostępna w tej sesji`,
  "history.openInBrowser": "Otwórz w przeglądarce",
  "history.edit": "Edytuj",
  "history.saveAsMarkdown": "Zapisz czat jako Markdown",
  "history.delete": "Usuń",
  "history.title": "Czat",
  "cli.installTitle": "Wypróbuj Smart AI CLI",
  "cli.installBody":
    "Używaj {command} interaktywnie w terminalu, a potem wdrażaj ciągłe przepływy pracy AI.",
  "cli.learnMore": "Dowiedz się więcej.",
  "cli.copied": "Skopiowano!",
  "assistant.configs": "Konfiguracje",
  "assistant.organizations": "Organizacje",
  "assistant.noConfigFound": "Nie znaleziono konfiguracji",
  "assistant.toggleHint": "{keyCombo} aby przełączyć konfigurację",
  "assistant.setUpConfigFile": "Skonfiguruj plik konfiguracyjny",
  "assistant.loading": "Ładowanie",
  "assistant.reload": "Odśwież",
  "assistant.logIn": "Zaloguj się",
  "assistant.logOut": "Wyloguj się",
  "assistant.manageAccount": "Zarządzaj kontem",
  "settings.screenWidthTooSmall": "Zbyt mała szerokość ekranu",
  "settings.expandSidebarHint":
    "Aby zobaczyć ustawienia, rozsuń panel boczny przeciągając lewy/prawy margines",
  "settings.installOllama": "Zainstaluj Ollama",
  "settings.downloadChatModel": "Pobierz model czatu",
  "settings.downloadAutocompleteModel": "Pobierz model autouzupełniania",
  "settings.downloadEmbeddingsModel": "Pobierz model embeddingów",
  "settings.connect": "Połącz",
  "settings.skipManual": "Pomiń i skonfiguruj ręcznie",
  "settings.modelsAddon": "Dodatek modeli",
  "settings.createAccount": "Utwórz konto",
  "settings.purchaseCredits": "Kup kredyty",
  "settings.logInHub":
    "Zaloguj się do Smart AI Hub, aby rozpocząć kodowanie z AI",
  "settings.logInHubButton": "Zaloguj się do Smart AI Hub",
  "settings.configureModels": "Lub skonfiguruj własne modele",
  "settings.accountCreated": "Konto utworzone!",
  "settings.welcome": "🎉 Witamy w Smart AI!",
  "settings.errorHandling": "Błąd podczas obsługi odpowiedzi modelu",
  "settings.viewErrorOutput": "Pokaż wynik błędu",
  "settings.copyOutput": "Skopiuj wynik",
  "settings.viewLogs": "Pokaż logi",
  "settings.restart": "Uruchom ponownie",
  "settings.checkApiKey": "Sprawdź klucz API",
  "settings.viewConfig": "Pokaż konfigurację",
  "settings.resubmitLastMessage": "Wyślij ponownie ostatnią wiadomość",
  "settings.openHelp": "Otwórz dokumentację pomocy",
  "settings.userSettings": "Ustawienia użytkownika",
  "settings.chat": "Czat",
  "settings.telemetry": "Telemetria",
  "settings.appearance": "Wygląd",
  "settings.autocomplete": "Autouzupełnianie",
  "settings.experimental": "Eksperymentalne",
  "settings.language": "Język",
  "settings.languageEnglish": "English",
  "settings.languagePolish": "Polski",
  "models.title": "Modele",
  "models.addModel": "Dodaj model",
  "models.addChatModel": "Dodaj model czatu",
  "models.configure": "Konfiguruj",
  "models.setupModel": "Skonfiguruj model {role}",
  "models.selectModel": "Wybierz model {role}",
  "models.selectModelShort": "Wybierz model",
  "models.noValidModels": "Brak {valid}modeli {role}{suffix}",
  "models.fallbackChat": ". Używany będzie model Chat",
  "models.invalidConfig": "(Nieprawidłowa konfiguracja)",
  "models.missingEnvSecret": "(Brak sekretu środowiskowego)",
  "models.missingApiKey": "(Brak klucza API)",
  "models.roles.chat": "Czat",
  "models.roles.autocomplete": "Autouzupełnianie",
  "models.roles.edit": "Edycja",
  "models.roles.apply": "Zastosuj",
  "models.roles.embed": "Embeddingi",
  "models.roles.rerank": "Reranking",
  "models.chat.descriptionPrefix": "Używany w trybach Czat, Plan i Agent",
  "models.autocomplete.descriptionPrefix":
    "Używany do podpowiedzi kodu podczas pisania",
  "models.edit.descriptionPrefix":
    "Używany do przekształcania zaznaczonego fragmentu kodu",
  "models.additionalRoles": "Dodatkowe role modeli",
  "models.additionalRolesSubtitle": "Zastosuj, Embeddingi, Reranking",
  "models.apply.description":
    "Używany do stosowania wygenerowanych bloków kodu do plików",
  "models.embed.description":
    "Używany do generowania i wyszukiwania embeddingów dla dostawców kontekstu @codebase i @docs",
  "models.rerank.description":
    "Używany do ponownego rangowania wyników z dostawców kontekstu @codebase i @docs",
  "modelSelect.autodetected": "(wykryto automatycznie)",
  "modelSelect.loadingConfig": "Ładowanie konfiguracji",
  "modelSelect.noModels": "Brak skonfigurowanych modeli",
  "modelSelect.autoRouter": "Automatyczny router modeli",
  "modelSelect.enableAutoSelect": "Włącz auto-wybór",
  "modelSelect.pool": "Pula:",
  "modelSelect.poolOllama": "Ollama (lokalnie)",
  "modelSelect.poolAnthropic": "Anthropic",
  "modelSelect.poolOpenAI": "OpenAI",
  "modelSelect.poolMixed": "Mieszana (najlepsza)",
  "modelSelect.toggleHint": "{keyCombo} aby przełączyć model",
};

const translations: Record<Locale, Record<string, TranslationValue>> = {
  en,
  pl,
};

export const localeLabels: Record<Locale, string> = {
  en: "English",
  pl: "Polski",
};

export const translate = (
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string => {
  const value = translations[locale][key] ?? translations.en[key];

  if (typeof value === "function") {
    return value(params);
  }

  if (typeof value === "string") {
    return interpolate(value, params);
  }

  return key;
};
