import {
  App,
  Menu,
  Plugin,
  TAbstractFile,
  TFile,
  TFolder,
} from "obsidian";
import { ExtensionHandler } from "./extension-handler";
import { ButtonHandler } from "./button-handler";
import { OpenAsCodeSettingTab } from "./settings";
import { DEFAULT_SETTINGS, type OpenAsCodeSettings } from "./types";
import { EditExtensionModal } from "./modal-change-extension";

export default class OpenAsCodePlugin extends Plugin {
  settings: OpenAsCodeSettings;
  extensionHandler: ExtensionHandler;
  buttonHandler: ButtonHandler;

  async onload(): Promise<void> {
    // Load settings
    await this.loadSettings();

    // Initialize handlers
    this.extensionHandler = new ExtensionHandler(this);
    this.buttonHandler = new ButtonHandler(this);

    // Register the settings tab
    this.addSettingTab(new OpenAsCodeSettingTab(this.app, this));

    // Register extensions to be viewed as markdown
    this.extensionHandler.registerCodeExtensions();

    // Register the button for toggling code block view
    this.buttonHandler.registerButton();

    // Register the event listener for file rename
    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => addMenuItem(app, menu, file)));

  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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

function addMenuItem(app: App, menu: Menu, file: TAbstractFile) {
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
