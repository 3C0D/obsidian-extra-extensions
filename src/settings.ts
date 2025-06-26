import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import OpenAsCodePlugin from "./main.ts";

export class OpenAsCodeSettingTab extends PluginSettingTab {
  private extList: HTMLElement;
  private textAreaEl: HTMLTextAreaElement;
  private validationEl: HTMLElement;

  constructor(app: App, public plugin: OpenAsCodePlugin) {
    super(app, plugin);
  }

  async display(): Promise<void> {
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

      // Initialize finalExtensions if empty (first load)
    if (this.plugin.settings.finalExtensions.length === 0) {
      this.plugin.settings.finalExtensions = Object.keys(this.plugin.settings.defaultLanguageMappings);
      await this.plugin.saveSettings();
    }

    // Add extensions setting
    const extensionSetting = new Setting(containerEl)
      .setName('Active Extensions')
      .setDesc('Manage all file extensions to be treated as code (comma separated, no dots). ❗Click outside the text area to validate changes.');
    
    extensionSetting.addTextArea(text => {
      this.textAreaEl = text.inputEl;
      text
        .setPlaceholder('js, ts, py, md, txt, csv')
        .setValue(this.plugin.settings.finalExtensions.join(', '))
        .inputEl.style.height = '130px'; // Make textarea taller
      
      text.inputEl.addEventListener('input', () => {
        this.validateExtensionsOnInput();
      });
      
      text.inputEl.addEventListener('blur', async () => {
        await this.processExtensionsOnBlur();
      });
    });
    
    // Add validation message element
    this.validationEl = containerEl.createEl('div', { 
      cls: 'extension-validation-message'
    });
    this.validationEl.style.display = 'none';
    this.validationEl.style.color = '#ff6b6b';
    this.validationEl.style.fontSize = '12px';
    this.validationEl.style.marginTop = '5px';

    // Display supported extensions
    new Setting(containerEl).setName('Extra Extensions').setHeading();

    const extList = containerEl.createEl('div', { cls: 'extension-list' });

    this.extList = extList.createEl('div', { cls: 'extension-list' });
    this.updateExtensionsList();
  }

  private getFinalExtensions(): string[] {
    return this.plugin.settings.finalExtensions || [];
  }

  private updateFinalExtensions(extensions: string[]): void {
    // Remove duplicates and filter out empty strings
    const uniqueExtensions = [...new Set(extensions.filter(ext => ext.length > 0))];
    this.plugin.settings.finalExtensions = uniqueExtensions;
  }

  private parseExtensions(value: string): string[] {
    return value.split(',')  // Split by commas only
      .map(ext => ext.trim().toLowerCase().replace(/^\./,''))  // Remove leading dots and trim
      .filter(ext => ext.length > 0);  // Remove empty strings
  }

  private validateExtensionsOnInput(): void {
    const inputValue = this.textAreaEl?.value || '';
    const inputExtensions = this.parseExtensions(inputValue);
    
    if (inputExtensions.length === 0) {
      this.hideValidationError();
      return;
    }
    
    // Check for extensions already registered elsewhere using ExtensionHandler
    const currentFinalExtensions = this.getFinalExtensions();
    const alreadyRegistered = inputExtensions.filter(ext => {
      return this.plugin.app.viewRegistry.getTypeByExtension(ext) && !currentFinalExtensions.includes(ext);
    });
    
    // Check for internal duplicates in the input
    const seen = new Set<string>();
    const internalDuplicates = inputExtensions.filter(ext => {
      if (seen.has(ext)) {
        return true;
      }
      seen.add(ext);
      return false;
    });
    
    const allProblems = [...new Set([...alreadyRegistered, ...internalDuplicates])];
    
    if (allProblems.length > 0) {
      let message = '';
      if (alreadyRegistered.length > 0) {
        message += `Already registered: ${alreadyRegistered.join(', ')}`;
      }
      if (internalDuplicates.length > 0) {
        if (message) message += '; ';
        message += `Duplicates: ${internalDuplicates.join(', ')}`;
      }
      this.showValidationError(message);
    } else {
      this.hideValidationError();
    }
  }

  private showValidationError(message: string): void {
    if (this.validationEl) {
      this.validationEl.textContent = message;
      this.validationEl.style.display = 'block';
    }
    if (this.textAreaEl) {
      this.textAreaEl.style.borderColor = '#ff6b6b';
    }
  }

  private hideValidationError(): void {
    if (this.validationEl) {
      this.validationEl.style.display = 'none';
    }
    if (this.textAreaEl) {
      this.textAreaEl.style.borderColor = '';
    }
  }

  private async processExtensionsOnBlur(): Promise<void> {
    const inputValue = this.textAreaEl?.value || '';
    const inputExtensions = this.parseExtensions(inputValue);
    
    // Get current state
    const currentFinalExtensions = this.getFinalExtensions();
    
    // Filter out extensions that already exist elsewhere in the system using ExtensionHandler
    const newExtensions = this.plugin.extensionHandler.getNewExtensions(inputExtensions);
    const duplicateExtensions = inputExtensions.filter(ext => !newExtensions.includes(ext) && !currentFinalExtensions.includes(ext));
    
    // Update finalExtensions with valid extensions only
    this.updateFinalExtensions(inputExtensions.filter(ext => newExtensions.includes(ext) || currentFinalExtensions.includes(ext)));
    
    // Update customExtensions based on what's not in defaultLanguageMappings
    const defaultExtensions = Object.keys(this.plugin.settings.defaultLanguageMappings);
    this.plugin.settings.customExtensions = this.plugin.settings.finalExtensions.filter(ext => !defaultExtensions.includes(ext));
    
    await this.plugin.saveSettings();

    // Unregister old extensions and register new ones using ExtensionHandler
    this.plugin.extensionHandler.unregisterCodeExtensions(currentFinalExtensions);
    this.plugin.extensionHandler.registerCodeExtensions(this.plugin.settings.finalExtensions);

    // Update UI
    this.updateExtensionsList();
    
    // Calculate changes for notifications
    const addedExtensions = this.plugin.settings.finalExtensions.filter(ext => !currentFinalExtensions.includes(ext));
    const removedExtensions = currentFinalExtensions.filter(ext => !this.plugin.settings.finalExtensions.includes(ext));
    
    // Show notifications
    if (addedExtensions.length > 0) {
      new Notice(`Added extensions: ${addedExtensions.join(', ')}`);
    }
    if (removedExtensions.length > 0) {
      new Notice(`Removed extensions: ${removedExtensions.join(', ')}`);
    }
    if (duplicateExtensions.length > 0) {
      new Notice(`Extensions already registered elsewhere: ${duplicateExtensions.join(', ')}`);
    }
    
    // Update textarea with clean extensions
    if (this.textAreaEl) {
      this.textAreaEl.value = this.plugin.settings.finalExtensions.join(', ');
    }
    this.hideValidationError();
  }

  // Method to refresh the list of extensions
  private updateExtensionsList(): void {
    if (!this.extList) return;
    this.extList.empty();

    const finalExtensions = this.getFinalExtensions();
    const defaultExtensions = Object.keys(this.plugin.settings.defaultLanguageMappings);
    
    if (finalExtensions.length > 0) {
      this.extList.createEl('h6', { text: 'Active Extensions:' });
      
      // Separate default and custom for display
      const activeDefaults = finalExtensions.filter(ext => defaultExtensions.includes(ext));
      const activeCustoms = finalExtensions.filter(ext => !defaultExtensions.includes(ext));
      
      if (activeDefaults.length > 0) {
        this.extList.createEl('p', { 
          text: `Default: ${activeDefaults.sort().join(', ')}`,
          attr: { style: 'color: #888; margin: 5px 0; font-size: 13px;' }
        });
      }
      
      if (activeCustoms.length > 0) {
        this.extList.createEl('p', { 
          text: `Custom: ${activeCustoms.sort().join(', ')}`,
          attr: { style: 'color: #4a9eff; margin: 5px 0; font-size: 13px;' }
        });
      }
      
      // Show total count
      this.extList.createEl('p', { 
        text: `Total: ${finalExtensions.length} extensions`,
        attr: { style: 'color: #666; margin-top: 10px; font-size: 12px; font-style: italic;' }
      });
    } else {
      this.extList.createEl('p', { 
        text: 'No extensions configured',
        attr: { style: 'color: #888; font-style: italic;' }
      });
    }
  }
}
