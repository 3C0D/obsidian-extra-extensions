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
    if (Object.keys(this.plugin.settings.finalExtensions).length === 0) {
      this.plugin.settings.finalExtensions = { ...this.plugin.settings.defaultLanguageMappings };
      await this.plugin.saveSettings();
    }

    // Add extensions setting
    const extensionSetting = new Setting(containerEl)
      .setName('Extra Extensions')
      .setDesc('Manage file extensions and their code block languages. Format: ",ext:language," or just ",ext,"  (ext and language are the same). You can also use the "Add Extension Mapping" command. ❗Click outside the text area to validate changes.');

    extensionSetting.addTextArea(text => {
      this.textAreaEl = text.inputEl;
      text
        .setPlaceholder('js, ts, py:python,...')
        .setValue(this.formatExtensionsForDisplay())
        .inputEl.style.height = '130px'; // Make textarea higher

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
    this.validationEl.style.fontSize = '0.8em';
    this.validationEl.style.marginTop = '5px';

    // Display supported extensions
    new Setting(containerEl).setName('Extra Extensions summary').setHeading();

    const extList = containerEl.createEl('div', { cls: 'extension-list' });

    this.extList = extList.createEl('div', { cls: 'extension-list' });
    this.updateExtensionsList();
  }

  private getFinalExtensions(): Record<string, string> {
    return this.plugin.settings.finalExtensions || {};
  }

  private formatExtensionsForDisplay(): string {
    const mappings = this.getFinalExtensions();
    return Object.entries(mappings)
      .map(([ext, lang]) => ext === lang ? ext : `${ext}:${lang}`)
      .join(', ');
  }

  private updateFinalExtensions(mappings: Record<string, string>): void {
    this.plugin.settings.finalExtensions = { ...mappings };
  }

  private parseExtensions(value: string): { mappings: Record<string, string>, errors: string[] } {
    const mappings: Record<string, string> = {};
    const errors: string[] = [];

    // Check for forbidden characters
    if (value.includes(';')) {
      errors.push("Use commas (,) instead of semicolons (;) to separate extensions");
    }

    // Detect duplicates in the input
    const seenExtensions = new Set<string>();
    const inputDuplicates: string[] = [];

    value.split(',')  // Split by commas
      .map(item => item.trim())  // Trim whitespace
      .filter(item => item.length > 0)  // Remove empty strings
      .forEach(item => {
        const cleanItem = item.toLowerCase().replace(/^\./, '');  // Remove leading dots

        if (cleanItem.includes(':')) {
          // Format: "ext:language"
          const [ext, lang] = cleanItem.split(':');
          if (ext && lang) {
            const trimmedExt = ext.trim();
            const trimmedLang = lang.trim();
            
            if (seenExtensions.has(trimmedExt)) {
              inputDuplicates.push(trimmedExt);
            } else {
              seenExtensions.add(trimmedExt);
              mappings[trimmedExt] = trimmedLang;
            }
          }
        } else {
          // Format: "ext" (maps to itself)
          if (cleanItem) {
            if (seenExtensions.has(cleanItem)) {
              inputDuplicates.push(cleanItem);
            } else {
              seenExtensions.add(cleanItem);
              mappings[cleanItem] = cleanItem;
            }
          }
        }
      });

    // Add duplicate errors to the input
    if (inputDuplicates.length > 0) {
      errors.push(`Duplicate extensions in input: ${[...new Set(inputDuplicates)].join(', ')}`);
    }

    return { mappings, errors };
  }

  private validateExtensionsOnInput(): void {
    const inputValue = this.textAreaEl?.value || '';
    const { mappings: inputMappings, errors: parseErrors } = this.parseExtensions(inputValue);
    const inputExtensions = Object.keys(inputMappings);

    if (inputExtensions.length === 0 && parseErrors.length === 0) {
      this.hideValidationError();
      return;
    }

    const allErrors: string[] = [...parseErrors];

    // Check for extensions already registered elsewhere using ExtensionHandler
    const currentFinalExtensions = Object.keys(this.getFinalExtensions());
    const alreadyRegistered = inputExtensions.filter(ext => {
      return this.plugin.app.viewRegistry.getTypeByExtension(ext) && !currentFinalExtensions.includes(ext);
    });

    if (alreadyRegistered.length > 0) {
      allErrors.push(`Already registered elsewhere: ${alreadyRegistered.join(', ')}`);
    }

    if (allErrors.length > 0) {
      this.showValidationError(allErrors.join('; '));
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
    const { mappings: inputMappings, errors: parseErrors } = this.parseExtensions(inputValue);
    
    // If there are parsing errors, stop processing and keep the error displayed
    if (parseErrors.length > 0) {
      this.showValidationError(parseErrors.join('; '));
      return;
    }

    const inputExtensions = Object.keys(inputMappings);

    // Get current state
    const currentFinalExtensions = this.getFinalExtensions();
    const currentExtensionKeys = Object.keys(currentFinalExtensions);

    // Filter out extensions that already exist elsewhere in the system using ExtensionHandler
    const newExtensions = this.plugin.extensionHandler.getNewExtensions(inputExtensions);
    const duplicateExtensions = inputExtensions.filter(ext => !newExtensions.includes(ext) && !currentExtensionKeys.includes(ext));

    // If there are extensions already registered elsewhere, stop and display the error
    if (duplicateExtensions.length > 0) {
      this.showValidationError(`Extensions already registered elsewhere: ${duplicateExtensions.join(', ')}`);
      return;
    }

    // Create valid mappings only (all extensions are valid now)
    const validMappings: Record<string, string> = {};
    Object.entries(inputMappings).forEach(([ext, lang]) => {
      if (newExtensions.includes(ext) || currentExtensionKeys.includes(ext)) {
        validMappings[ext] = lang;
      }
    });

    // Update finalExtensions with valid mappings
    this.updateFinalExtensions(validMappings);

    // Update customExtensions based on what's not in defaultLanguageMappings
    const defaultExtensions = Object.keys(this.plugin.settings.defaultLanguageMappings);
    const customMappings: Record<string, string> = {};
    Object.entries(this.plugin.settings.finalExtensions).forEach(([ext, lang]) => {
      if (!defaultExtensions.includes(ext)) {
        customMappings[ext] = lang;
      }
    });
    this.plugin.settings.customExtensions = customMappings;

    await this.plugin.saveSettings();

    // Unregister old extensions and register new ones using ExtensionHandler
    this.plugin.extensionHandler.unregisterCodeExtensions(currentExtensionKeys);
    this.plugin.extensionHandler.registerCodeExtensions(Object.keys(this.plugin.settings.finalExtensions));

    // Update UI
    this.updateExtensionsList();

    // Calculate changes for notifications
    const newFinalExtensions = Object.keys(this.plugin.settings.finalExtensions);
    const addedExtensions = newFinalExtensions.filter(ext => !currentExtensionKeys.includes(ext));
    const removedExtensions = currentExtensionKeys.filter(ext => !newFinalExtensions.includes(ext));

    // Show notifications
    if (addedExtensions.length > 0) {
      new Notice(`Added extensions: ${addedExtensions.join(', ')}`);
    }
    if (removedExtensions.length > 0) {
      new Notice(`Removed extensions: ${removedExtensions.join(', ')}`);
    }

    // Update textarea with clean extensions
    if (this.textAreaEl) {
      this.textAreaEl.value = this.formatExtensionsForDisplay();
    }
    this.hideValidationError();
  }

  // Method to refresh the list of extensions
  private updateExtensionsList(): void {
    if (!this.extList) return;
    this.extList.empty();

    const finalExtensions = this.getFinalExtensions();
    const defaultExtensions = Object.keys(this.plugin.settings.defaultLanguageMappings);
    const extensionKeys = Object.keys(finalExtensions);

    if (extensionKeys.length > 0) {
      this.extList.createEl('h6', { text: 'Active Extensions:' });

      // Separate default and custom for display
      const activeDefaults = extensionKeys.filter(ext => defaultExtensions.includes(ext));
      const activeCustoms = extensionKeys.filter(ext => !defaultExtensions.includes(ext));

      if (activeDefaults.length > 0) {
        const defaultMappings = activeDefaults.map(ext =>
          ext === finalExtensions[ext] ? ext : `${ext}:${finalExtensions[ext]}`
        ).sort();
        this.extList.createEl('p', {
          text: `Default: ${defaultMappings.join(', ')}`,
          attr: { style: 'color: #888; margin: 5px 0; font-size: 0.9em;' }
        });
      }

      if (activeCustoms.length > 0) {
        const customMappings = activeCustoms.map(ext =>
          ext === finalExtensions[ext] ? ext : `${ext}:${finalExtensions[ext]}`
        ).sort();
        this.extList.createEl('p', {
          text: `Custom: ${customMappings.join(', ')}`,
          attr: { style: 'color: #4a9eff; margin: 5px 0; font-size: 0.9em;' }
        });
      }

      // Show total count
      this.extList.createEl('p', {
        text: `Total: ${extensionKeys.length} extensions`,
        attr: { style: 'color: #666; margin-top: 10px; font-size: 0.8em; font-style: italic;' }
      });
    } else {
      this.extList.createEl('p', {
        text: 'No extensions configured',
        attr: { style: 'color: #888; font-style: italic;' }
      });
    }
  }
}