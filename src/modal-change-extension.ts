import { App, ButtonComponent, Modal, TextComponent, TFile } from 'obsidian';
import path from 'path';

export class EditExtensionModal extends Modal {
  private dirPath: string;
  private baseName: string;
  private currentExt: string;
  private newExt: string;

  constructor(
    app: App,
    private file: TFile
  ) {
    super(app);

    // Use path module for cross-platform path handling
    this.dirPath = path.dirname(file.path);
    this.baseName = path.basename(file.path, path.extname(file.path));
    this.currentExt = path.extname(file.path).replace('.', '');
    this.newExt = this.currentExt;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    // this.titleEl.textContent = 'Edit Extension';
    // set modal size 
    this.modalEl.style.width = '300px';
    this.modalEl.style.height = 'auto';
    this.modalEl.style.minWidth = '300px';
    this.modalEl.style.maxHeight = '200px';
    
    // Also set the container size
    contentEl.style.width = '100%';
    contentEl.style.height = 'auto';
    contentEl.style.padding = '10px';

    // Container styles
    contentEl.addClass('extension-modal');

    // File path display
    const pathDisplay = contentEl.createEl('div', {
      cls: 'extension-modal-path',
      text: this.getFullPath()
    });

    // Extension input container
    const inputContainer = contentEl.createEl('div', {
      cls: 'extension-modal-input'
    });

    // Extension input
    const extInput = new TextComponent(inputContainer)
      .setValue(this.currentExt)
      .onChange(value => {
        this.newExt = value.startsWith('.') ? value.slice(1) : value;
        pathDisplay.textContent = this.getFullPath();
      });

    // Submit button  
    new ButtonComponent(inputContainer)
      .setButtonText('Save')
      .setCta()
      .onClick(() => this.saveChanges());

    // Handle keyboard events
    extInput.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.saveChanges();
      if (e.key === 'Escape') this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private async saveChanges() {
    await this.app.vault.rename(this.file, this.getFullPath());
    this.close();
  }

  private getFullPath(): string {
    return path.join(this.dirPath, this.baseName + (this.newExt ? `.${this.newExt}` : ''));
  }
}