export interface OpenAsCodeSettings {
  enabled: boolean;
  customExtensions: string[];
  defaultLanguageMappings: Record<string, string>;
  finalExtensions: string[]; // Final list of all active extensions
}

export const DEFAULT_SETTINGS: OpenAsCodeSettings = {
  enabled: true,
  customExtensions: [],
  finalExtensions: [], // Will be populated from defaultLanguageMappings on first load
  defaultLanguageMappings: {
    "js": "javascript",
    "ts": "typescript",
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
    "c": "clike",
    "cpp": "clike",
    "cs": "clike",
    "php": "php",
    "go": "go",
    "rust": "rust",
    "sql": "sql",
    "sh": "shell",
    "bash": "shell",
    "tex": "stex",
    "r": "r",
    "txt": "markdown",
  }
};