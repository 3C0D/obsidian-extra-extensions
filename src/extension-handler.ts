import type OpenAsCodePlugin from "./main.ts";

export class ExtensionHandler {
  constructor(private plugin: OpenAsCodePlugin) {
  }

  // Returns a copy of the supported code extensions
  getAddedExtensions(): string[] {
    return [...this.plugin.settings.finalExtensions];
  }

  getNewExtensions(extensions: string[]): string[] {
    return extensions.filter(ext => !this.plugin.app.viewRegistry.getTypeByExtension(ext));
  }

  hasUnregisteredExtensions(extensions: string[]): boolean {
    // Filter out extensions that are already registered
    const newExtensions = this.getNewExtensions(extensions);
    return newExtensions.length > 0;

  }

  /**
   *
   * @param extensions - Array of file extensions (default: getAddedExtensions())
   */
  registerCodeExtensions(extensions: string[] = this.getAddedExtensions()): void {
    try {
      if (this.hasUnregisteredExtensions(extensions)) {
        const newExtensions = this.getNewExtensions(extensions);
        this.plugin.registerExtensions(newExtensions, 'markdown');
      }
    } catch (error) {
      console.error("Failed to register extensions:", error);
    }
  }

  /**
   * 
   * @param extensions - Array of file extensions (default: getAddedExtensions())
   */
  unregisterCodeExtensions(extensions: string[] = this.getAddedExtensions()): void {
    try {
      this.plugin.app.viewRegistry.unregisterExtensions(extensions);
    } catch (error) {
      console.error("Failed to unregister extensions:", error);
    }
  }
}