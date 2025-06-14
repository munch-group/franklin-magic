import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { Cell, CodeCell } from '@jupyterlab/cells';
import { IOutput } from '@jupyterlab/nbformat';

function isPixiInstallMagic(cell: Cell): boolean {
  if (cell.model.type !== 'code') return false;
  const text = cell.model.value.text;
  return /^%pixi_install\b/.test(text.trim());
}

function hasPixiSuccessOutput(cell: CodeCell): boolean {
  const outputs = cell.model.outputs.toJSON() as IOutput[];
  return outputs.some(output => {
    if (output.output_type === 'stream' && output.name === 'stdout') {
      return /installed successfully/i.test(output.text as string);
    }
    if (output.output_type === 'execute_result' && 'data' in output) {
      const text = output.data['text/plain'];
      return typeof text === 'string' && /installed successfully/i.test(text);
    }
    return false;
  });
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'pixi-magic-extension',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, notebookTracker: INotebookTracker) => {
    notebookTracker.widgetAdded.connect((_, panel) => {
      panel.sessionContext.ready.then(() => {
        const notebook = panel.content;

        notebook.model?.cells.changed.connect((_, changes) => {
          notebook.widgets.forEach(widget => {
            if (!(widget instanceof CodeCell)) return;
            const cell = widget as CodeCell;

            if (!isPixiInstallMagic(cell)) return;

            const observer = cell.model.outputs.changed.connect(() => {
              if (hasPixiSuccessOutput(cell)) {
                console.log('pixi_install succeeded, converting to raw');
                cell.model.type = 'raw';
                observer.disconnect();
              }
            });
          });
        });
      });
    });
  }
};

export default plugin;
