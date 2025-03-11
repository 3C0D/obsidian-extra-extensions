import { MarkdownView } from "obsidian";
import type { OpenAsCodeSettings } from "./types";
import type OpenAsCodePlugin from "./main";


export class ButtonHandler {
    private plugin: OpenAsCodePlugin;
    private buttonEl: HTMLElement | null = null;

    constructor(plugin: OpenAsCodePlugin) {
        this.plugin = plugin;
    }

    registerButton(): void {
        // Create event with file-open
        const eventRef = this.plugin.app.workspace.on('file-open', (file) => {
            if (!file) return;
            const extension = file.extension.toLowerCase();

            // Use extension mappings from settings
            const settings = this.plugin.settings
            const supportedExtensions = Object.keys(settings.languageMappings);

            if (supportedExtensions.includes(extension)) {
                this.addButton();
            } else {
                this.removeButton();
            }
        });
    }

    private addButton(): void {
        // Remove existing button if any
        this.removeButton();

        // Get the title bar where we'll add our button
        const titleEl = document.querySelector('.view-header-title-container');
        if (!titleEl) return;

        // Create the button
        this.buttonEl = createEl('div', { cls: ['view-action', 'code-block-toggle'] });

        // Set initial state based on current view
        this.updateButtonAppearance();

        // Add click handler
        this.buttonEl.addEventListener('click', () => {
            this.toggleCodeBlockView();
        });

        // Add the button to the title bar, next to the book icon
        titleEl.appendChild(this.buttonEl);
    }

    removeButton(): void {
        if (this.buttonEl && this.buttonEl.parentNode) {
            this.buttonEl.parentNode.removeChild(this.buttonEl);
            this.buttonEl = null;
        }
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
        const settings = this.plugin.settings as OpenAsCodeSettings;
        const languageMode = settings.languageMappings[extension] || "markdown";

        try {
            // Get current content
            const currentContent = activeView.editor.getValue();

            // Simplified check: just look for 5 backticks at beginning and end
            const hasOpeningCodeBlock = /^\s*`{5}[\w]*\s*\n/.test(currentContent);
            const hasClosingCodeBlock = /\n\s*`{5}\s*$/.test(currentContent);
            const isCodeBlockView = hasOpeningCodeBlock && hasClosingCodeBlock;

            if (isCodeBlockView) {
                // Remove code block formatting - just remove the first and last lines with 5 backticks
                const contentWithoutCodeBlock = currentContent
                    .replace(/^\s*`{5}[\w]*\s*\n/, '') // Remove opening code block
                    .replace(/\n\s*`{5}\s*$/, '');     // Remove closing code block

                // Update the editor content
                activeView.editor.setValue(contentWithoutCodeBlock);
            } else {
                // Add code block formatting with 5 backticks
                const originalContent = currentContent;
                const codeBlockContent = `\`\`\`\`\`${languageMode}\n${originalContent}\n\`\`\`\`\``;

                // Update the editor content
                activeView.editor.setValue(codeBlockContent);
            }
        } catch (error) {
            console.error("Failed to toggle code block view:", error);
            new Notice("Failed to toggle code block view");
        }finally {
            if (wasInPreviewMode) {
                await activeView.setState({ mode: 'preview' }, { history: false });
            }
        }
    }
    private updateButtonAppearance(): void {
        if (!this.buttonEl) return;

        // Use a neutral icon that indicates toggling functionality
        // No color change based on state
        this.buttonEl.innerHTML = '<svg viewBox="0 0 100 100" class="code-block-icon" width="16" height="16"><path fill="currentColor" d="M30,30 L70,30 L70,70 L30,70 Z M40,40 L60,40 M40,50 L60,50 M40,60 L60,60"></path></svg>';
        this.buttonEl.setAttribute('aria-label', 'Toggle code block view');
    }
}