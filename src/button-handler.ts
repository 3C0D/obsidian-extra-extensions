import { App, MarkdownView, Notice } from "obsidian";
import type OpenAsCodePlugin from "./main.ts";

export class ButtonHandler {
    private buttonEl: HTMLElement | null = null;
    constructor(private plugin: OpenAsCodePlugin, private app: App) {
    }

    registerButton(): void {
        // Create event with file-open
        this.plugin.registerEvent(this.plugin.app.workspace.on('file-open', (file) => {
            if (!file) return;
            const extension = file.extension.toLowerCase();

            // Use all active extensions from settings
            const settings = this.plugin.settings;
            const supportedExtensions = settings.finalExtensions || {};

            if (extension in supportedExtensions) {
                this.addButton();
            } else {
                this.removeButton();
            }
        }));
    }

    private addButton(): void {
        // Remove existing button if any
        this.removeButton();

        // Get the active leaf and its title container
        const activeLeaf = this.plugin.app.workspace.getLeaf(false);
        if (!activeLeaf) return;

        const titleEl = activeLeaf.view.containerEl.querySelector('.view-header-title-container');
        if (!titleEl) return;

        // Create the button
        this.buttonEl = createEl('div', { cls: 'code-block-toggle' });

        // Set initial state based on current view
        this.updateButtonAppearance();

        // Add click handler
        this.buttonEl.addEventListener('click', () => {
            this.toggleCodeBlockView();
        });

        // Add listener for content changes to update button appearance
        const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
            // Update button when editor content changes
            this.plugin.registerEvent(
                this.app.workspace.on("layout-change", () => {
                    setTimeout(() => this.updateButtonAppearance(), 50);
                })
            );
        }

        // Add the button to the title bar, next to the book icon
        titleEl.appendChild(this.buttonEl);
    }

    removeButton(): void {
        // Remove all code-block-toggle buttons
        const allButtons = document.querySelectorAll('.code-block-toggle');
        allButtons.forEach(button => {
            if (button.parentNode) {
                button.parentNode.removeChild(button);
            }
        });

        // Reset internal button reference
        this.buttonEl = null;
    }

    async toggleCodeBlockView(): Promise<void> {
        const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return;

        // Check if we are in preview mode
        const wasInPreviewMode = activeView.getMode() === 'preview';

        // If in preview mode, switch to edit mode
        if (wasInPreviewMode) {
            await activeView.setState({ mode: 'source' }, { history: false });
        }

        const file = activeView.file;
        if (!file) return;

        const extension = file.extension.toLowerCase();

        // Use extension mappings from settings
        const settings = this.plugin.settings;
        // Get the language mapping for this extension from finalExtensions
        const languageMode = settings.finalExtensions[extension] || extension;

        try {
            // Get current content
            const currentContent = activeView.editor.getValue();

            if (this.isCurrentlyInCodeBlockView()) {
                // Remove code block formatting - remove the 5 backticks patterns anywhere in content
                const contentWithoutCodeBlock = currentContent
                    .replace(/`{5}[\w]*\s*\n/, '') // Remove opening code block
                    .replace(/\n\s*`{5}/, '');     // Remove closing code block

                // Update the editor content
                activeView.editor.setValue(contentWithoutCodeBlock);
            } else {
                // Add code block formatting with 5 backticks
                const originalContent = currentContent;
                const codeBlockContent = `\`\`\`\`\`${languageMode}\n${originalContent}\n\`\`\`\`\``;

                // Update the editor content
                activeView.editor.setValue(codeBlockContent);
            }

            // Update button appearance after content change
            setTimeout(() => this.updateButtonAppearance(), 100);

        } catch (error) {
            console.error("Failed to toggle code block view:", error);
            new Notice("Failed to toggle code block view");
        } finally {
            if (wasInPreviewMode) {
                await activeView.setState({ mode: 'preview' }, { history: false });
            }
        }
    }

    private updateButtonAppearance(): void {
        if (!this.buttonEl) return;

        // Check current state to determine button appearance
        const isCodeBlockView = this.isCurrentlyInCodeBlockView();

        if (isCodeBlockView) {
            // Code block view - show "code" icon with active state
            this.buttonEl.innerHTML = '<svg viewBox="0 0 24 24" class="code-block-icon" width="16" height="16"><path fill="currentColor" d="M8 3L6 5L10 9L6 13L8 15L14 9L8 3ZM16 17V19H18V17H16Z"></path></svg>';
            this.buttonEl.addClass('code-block-active');
            this.buttonEl.setAttribute('aria-label', 'Switch to normal view');
        } else {
            // Normal view - show "document" icon with inactive state
            this.buttonEl.innerHTML = '<svg viewBox="0 0 24 24" class="code-block-icon" width="16" height="16"><path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"></path></svg>';
            this.buttonEl.removeClass('code-block-active');
            this.buttonEl.setAttribute('aria-label', 'Switch to code block view');
        }
    }

    private isCurrentlyInCodeBlockView(): boolean {
        const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return false;

        const currentContent = activeView.editor.getValue();
        // Look for 5 backticks pattern anywhere in the content, not just at start/end
        const hasOpeningCodeBlock = /`{5}[\w]*\s*\n/.test(currentContent);
        const hasClosingCodeBlock = /\n\s*`{5}/.test(currentContent);

        return hasOpeningCodeBlock && hasClosingCodeBlock;
    }
}