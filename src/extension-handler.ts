import type OpenAsCodePlugin from "./main.ts";

export class ExtensionHandler {
  constructor(private plugin: OpenAsCodePlugin) {
  }

  // Returns a copy of the supported code extensions
  getCodeExtensions(): string[] {
    const settings = this.plugin.settings;
    return [...Object.keys(settings.languageMappings), ...(settings.customExtensions || [])];
  }
  
  // Registers all code extensions to be displayed as markdown
  registerCodeExtensions(): void {
      try {
          const extensions = this.getCodeExtensions();
          // Filter out extensions that are already registered
          const newExtensions = extensions.filter(ext => !this.plugin.app.viewRegistry.getTypeByExtension(ext));
          if (newExtensions.length > 0) {
              this.plugin.registerExtensions(newExtensions, 'markdown');
          }
      } catch (error) {
          console.error("Failed to register extensions:", error);
      }
  }
  
  // Unregisters extensions when the plugin is disabled
  unregisterCodeExtensions(): void {
    try {
      const extensions = this.getCodeExtensions();
      this.plugin.app.viewRegistry.unregisterExtensions(extensions);
    } catch (error) {
      console.error("Failed to unregister extensions:", error);
    }
  }
}