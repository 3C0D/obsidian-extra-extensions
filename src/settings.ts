import { App, PluginSettingTab, Setting } from "obsidian";
import OpenAsCodePlugin from "./main.ts";

export class OpenAsCodeSettingTab extends PluginSettingTab {
  private extList: HTMLElement;

  constructor(app: App, public plugin: OpenAsCodePlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Enable plugin')
      .setDesc('Toggle to enable or disable the plugin')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enabled)
        .onChange(async (value) => {
          this.plugin.settings.enabled = value;
          await this.plugin.saveSettings();

          if (value) {
            this.plugin.extensionHandler.registerCodeExtensions();
          } else {
            this.plugin.extensionHandler.unregisterCodeExtensions();
          }
        }));

    // Add custom extensions setting
    new Setting(containerEl)
      .setName('Custom Extensions')
      .setDesc('Add custom file extensions to be treated as code (comma separated, no dots)')
      .addTextArea(text => text
        .setPlaceholder('md, txt, csv')
        .setValue(this.plugin.settings.customExtensions.join(', '))
        .onChange(async (value) => {
          // Parse comma-separated values, trim whitespace, and filter empty strings
          const extensions = value.split(',')
            .map(ext => ext.trim().toLowerCase())
            .filter(ext => ext.length > 0);

          this.plugin.settings.customExtensions = extensions;
          await this.plugin.saveSettings();

          // Re-register extensions
          this.plugin.extensionHandler.unregisterCodeExtensions();
          this.plugin.extensionHandler.registerCodeExtensions();

          // Re-registering extensions will update the button's appearance
          this.updateExtensionsList();
        }));

    // Display supported extensions
    new Setting(containerEl).setName('Supported Extensions').setHeading();

    const extList = containerEl.createEl('div', { cls: 'extension-list' });

    this.extList = extList.createEl('div', { cls: 'extension-list' });
    this.updateExtensionsList();
  }

  // Method to refresh the list of extensions
  private updateExtensionsList(): void {
    if (!this.extList) return;
    this.extList.empty();

    const allExtensions = [
      ...Object.keys(this.plugin.settings.languageMappings),
      ...this.plugin.settings.customExtensions
    ];

    // Remove duplicates and sort
    const uniqueExtensions = [...new Set(allExtensions)].sort();

    this.extList.createEl('p', { text: uniqueExtensions.join(', ') });
  }
}
