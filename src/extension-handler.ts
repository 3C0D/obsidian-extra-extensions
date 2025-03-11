import type OpenAsCodePlugin from "./main";

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
      this.plugin.registerExtensions(extensions, 'markdown');
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