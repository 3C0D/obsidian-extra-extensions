import {
  App,
  // loadPrism,
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
import { AddExtensionModal } from "./modal-add-extension.ts";

export default class OpenAsCodePlugin extends Plugin {
  settings: OpenAsCodeSettings;
  extensionHandler: ExtensionHandler;
  buttonHandler: ButtonHandler;

  async onload(): Promise<void> {
    await this.loadSettings();

    // languages in codeblocks are different. e.g: py not accepted
    // only used in preview mode
    // const prism = await loadPrism();
    // const languages = prism.languages;
    // console.log("languages", languages);

    // for the edit mode we need codemirror
    // if (window.CodeMirror) {
    //   console.log("✅ CodeMirror détecté");
    //   if (window.CodeMirror.modes) {
    //     console.log("CodeMirror 5 modes:", Object.keys(window.CodeMirror.modes));
    //   }
    // if (window.CodeMirror.EditorState) {
    //   console.log("CodeMirror 6 détecté");
    // }
    // } else {
    //   console.log("❌ CodeMirror non trouvé directement");
    // }

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

    // Add command to open extension modal
    this.addCommand({
      id: 'add-extension-mapping',
      name: 'Add Extension Mapping',
      callback: () => {
        const modal = new AddExtensionModal(this.app, this);
        modal.open();
      }
    });

  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    // Initialize finalExtensions if empty
    if (!this.settings.finalExtensions || Object.keys(this.settings.finalExtensions).length === 0) {
      // Merge default and custom mappings
      this.settings.finalExtensions = {
        ...this.settings.defaultLanguageMappings,
        ...(this.settings.customExtensions || {})
      };
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

  // Add menu item to edit file extension
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
            // Calculate offset to move modal from center to 60px from left
            const windowWidth = document.documentElement.clientWidth;
            // const modalWidth = modalElement.offsetWidth || 400; // fallback width
            const modalWidth = parseInt(modalElement.style.width);
            const centerPosition = windowWidth / 2;
            const targetPosition = 60 + (modalWidth / 2); // 60px from left + half modal width
            const offsetX = targetPosition - centerPosition;

            modalElement.style.transform = `translateX(${offsetX}px)`;
          }
        }, 0);
      });
  });
}
