export interface OpenAsCodeSettings {
  enabled: boolean;
  customExtensions: Record<string, string>; // Custom extension to language mappings
  defaultLanguageMappings: Record<string, string>;
  finalExtensions: Record<string, string>; // Final mapping of all active extensions to languages
}

export const DEFAULT_SETTINGS: OpenAsCodeSettings = {
  enabled: true,
  customExtensions: {},
  finalExtensions: {}, // Will be populated from defaultLanguageMappings on first load
  defaultLanguageMappings: {
    "js": "js",
    "ts": "ts",
    "jsx": "jsx",
    "tsx": "tsx",
    "css": "css",
    "scss": "scss",
    "sass": "sass",
    "json": "json",
    "yaml": "yaml",
    "yml": "yaml",
    "html": "html",
    "xml": "xml",
    "py": "python",
    "rb": "ruby",
    "java": "java",
    "c": "c",
    "cpp": "cpp",
    "cs": "cs",
    "php": "php",
    "go": "go",
    "rust": "rust",
    "sql": "sql",
    "sh": "shell",
    "bash": "shell",
    "bat": "shell",
    "ps1": "powershell",
    "tex": "stex",
    "r": "r",
    "txt": "txt",
  }
};