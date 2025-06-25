import {
  App,
  Menu,
  Plugin,
  TAbstractFile,
  TFile,
  TFolder,
} from "obsidian";
import { ExtensionHandler } from "./extension-handler.ts";
import { ButtonHandler } from "./button-handler.ts";
import { OpenAsCodeSettingTab } from "./settings.ts";
import { DEFAULT_SETTINGS, type OpenAsCodeSettings } from "./types.ts";
import { EditExtensionModal } from "./modal-change-extension.ts";

export default class OpenAsCodePlugin extends Plugin {
  settings: OpenAsCodeSettings;
  extensionHandler: ExtensionHandler;
  buttonHandler: ButtonHandler;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Initialize handlers
    this.extensionHandler = new ExtensionHandler(this);
    this.buttonHandler = new ButtonHandler(this, this.app);

    // Register the settings tab
    this.addSettingTab(new OpenAsCodeSettingTab(this.app, this));

    // Register extensions to be viewed as markdown
    this.extensionHandler.registerCodeExtensions();

    // Register the button for toggling code block view
    this.buttonHandler.registerButton();

    // Register the event listener for file rename
    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => addMenuItem(this.app, menu, file)));

  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    
    // Initialize finalExtensions if empty (migration from old settings)
    if (!this.settings.finalExtensions || this.settings.finalExtensions.length === 0) {
      this.settings.finalExtensions = [
        ...Object.keys(this.settings.defaultLanguageMappings),
        ...(this.settings.customExtensions || [])
      ];
      // Remove duplicates
      this.settings.finalExtensions = [...new Set(this.settings.finalExtensions)];
      await this.saveSettings();
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  onunload(): void {
    // Clean up
    this.extensionHandler.unregisterCodeExtensions();
    this.buttonHandler.removeButton();
  }
}

function addMenuItem(app: App, menu: Menu, file: TAbstractFile): void {
  if (file instanceof TFolder) {
    return;
  }
  menu.addItem((item) => {
    item
      .setTitle("Edit Extension")
      .setIcon("pencil")
      .onClick(() => {
        // Create and open the modal
        const modal = new EditExtensionModal(
          app,
          file as TFile,
        );

        // Open the modal
        modal.open();

        // Access the modal's DOM element and modify its position
        setTimeout(() => {
          const modalElement = modal.containerEl.querySelector('.modal') as HTMLElement;
          if (modalElement) {
            const windowWidth = document.documentElement.clientWidth;
            const leftMargin = 60;
            const modalWidth = parseInt(modalElement.style.width);
            const maxRightPosition = windowWidth / 2 - leftMargin - modalWidth / 2; // from center
            modalElement.style.right = `${maxRightPosition}px`;
          }
        }, 0);
      });
  });
}
