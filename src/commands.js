'use strict';
// Report commands (free and Pro), samples, help, and the licence and trial commands.

const config = require('./licence/config');
const messages = require('./licence/messages');
const core = require('./core');
const { createUi } = require('./ui');
const { sampleFor } = require('./samples');
const { diagnosticsBlock, reportProblemText } = require('./support');

const WALKTHROUGH_ID = 'SmallStepsStudio.har-atlas#harAtlas.gettingStarted';

function registerCommands(app) {
  const vscode = app.vscode;
  const ui = createUi(app);
  app.ui = ui;
  const reg = ui.reg;
  const info = ui.info;
  const warn = ui.warn;
  const NAME = ui.NAME;
  const BUTTONS = ui.BUTTONS;

  // Builds a report from the text of the editor and opens it as a new Markdown document (and its preview when the
  // setting harAtlas.openReportsAsPreview is on). The file itself is never changed.
  async function showReport(editor, title, build, fileName) {
    const markdown = build(editor.document.getText());
    const doc = await ui.openText(markdown, 'markdown', fileName);
    if (app.getSettings().openReportsAsPreview) {
      await vscode.commands.executeCommand('markdown.showPreview', doc.uri).then(undefined, function () { /* the Markdown editor stays open */ });
    }
    vscode.window.setStatusBarMessage(NAME + ': ' + title, 4000);
  }

  // ---- report commands -----------------------------------------------------------------------------
  reg('harAtlas.showSummary', async function () {
    const editor = ui.textEditor();
    if (!editor) return;
    await showReport(editor, "Show Summary", core.reportSummary, 'har-show-summary.md');
  });
  reg('harAtlas.showFailedRequests', async function () {
    const editor = ui.textEditor();
    if (!editor) return;
    await showReport(editor, "Show Failed Requests", core.reportFailedRequests, 'har-show-failed-requests.md');
  });
  reg('harAtlas.showSlowestRequests', async function () {
    const editor = ui.textEditor();
    if (!editor) return;
    await showReport(editor, "Show Slowest Requests", core.reportSlowestRequests, 'har-show-slowest-requests.md');
  });
  reg('harAtlas.showHostBreakdown', async function () {
    const editor = ui.textEditor();
    if (!editor) return;
    if (!(await ui.requirePro("Show Host Breakdown"))) return;
    await showReport(editor, "Show Host Breakdown", core.reportHostBreakdown, 'har-show-host-breakdown.md');
  });
  reg('harAtlas.showCachingCompression', async function () {
    const editor = ui.textEditor();
    if (!editor) return;
    if (!(await ui.requirePro("Show Caching And Compression"))) return;
    await showReport(editor, "Show Caching And Compression", core.reportCachingCompression, 'har-show-caching-and-compression.md');
  });

  // ---- samples and help ----------------------------------------------------------------------------
  async function openSample(id) {
    const s = sampleFor(id);
    if (!s) { warn('This installation is incomplete; reinstall the extension.'); return; }
    await ui.openText(s.text, s.languageId, s.fileName);
    vscode.window.setStatusBarMessage(NAME + ': opened the ' + s.title + ' (invented data)', 5000);
  }
  reg('harAtlas.openSample', function () { return openSample('openSample'); });
  reg('harAtlas.openWalkthrough', async function () { await vscode.commands.executeCommand('workbench.action.openWalkthrough', WALKTHROUGH_ID, false); });
  reg('harAtlas.showDocumentation', async function () { await ui.openExternal(config.docsUrl); });

  reg('harAtlas.reportProblem', async function () {
    const editor = vscode.window.activeTextEditor;
    const active = editor ? { kind: editor.document.languageId + ' file', size: app.lengthOf(editor.document) } : null;
    const block = diagnosticsBlock({
      extensionVersion: app.extensionVersion, editorName: vscode.env && vscode.env.appName, editorVersion: vscode.version, platform: process.platform,
      osRelease: app.osRelease(), arch: process.arch, nodeVersion: process.versions && process.versions.node, settings: app.settingsForReport(), defaults: app.defaults,
      licence: await app.licence.peek(), active: active
    });
    await vscode.env.clipboard.writeText(block);
    const opened = await ui.openExternal(config.issuesUrl);
    info(NAME + ': ' + reportProblemText(opened !== false));
  });

  // ---- licence commands ----------------------------------------------------------------------------
  reg('harAtlas.buyPro', async function () {
    const choice = await vscode.window.showQuickPick(messages.buyChoices(), { placeHolder: 'Which licence? Both unlock the same Pro features.', matchOnDescription: true, matchOnDetail: true });
    if (!choice) return;
    let users = 1;
    if (choice.tier === 'business') {
      const answer = await vscode.window.showInputBox({ title: NAME + ' Pro Business: ' + messages.businessUsersQuestion(), value: '1', ignoreFocusOut: true, validateInput: messages.businessUsersError });
      if (answer === undefined) return;
      if (messages.businessUsersError(answer)) { warn(messages.businessUsersError(answer) + ' The checkout page was not opened.'); return; }
      users = Number(String(answer).trim());
    }
    const url = app.licence.buyUrl(choice.tier, users);
    if (!url) { info(NAME + ': ' + choice.label + ' is not on sale yet. Please check the extension page again soon.'); return; }
    await ui.openExternal(url);
  });

  reg('harAtlas.enterKey', async function () {
    const raw = await vscode.window.showInputBox({
      title: NAME + ' Pro: paste the licence key from your purchase e-mail', placeHolder: 'Licence key', ignoreFocusOut: true, password: true,
      validateInput: function (v) { return /\s/.test((v || '').trim()) ? 'A licence key contains no spaces.' : null; }
    });
    const key = (raw || '').trim();
    if (!key) return;
    const result = await app.licence.activate(key);
    if (result.ok) info(NAME + ': ' + messages.activatedText(result.licenceType, result));
    else {
      const pick = await vscode.window.showErrorMessage(NAME + ': ' + messages.activationFailureText(result), BUTTONS.lost);
      if (pick === BUTTONS.lost) await ui.showLostKey();
    }
  });

  reg('harAtlas.licenceStatus', async function () {
    const st = await app.licence.status(true);
    const text = NAME + ': ' + messages.licenceStatusText(st);
    let pick;
    if (st.pro) pick = await info(text, BUTTONS.remove);
    else if (st.hasKey) pick = await info(text, BUTTONS.enter, BUTTONS.remove, BUTTONS.lost);
    else pick = await info(text, BUTTONS.buy, BUTTONS.enter, BUTTONS.lost);
    await ui.handleLicenceButton(pick);
  });

  reg('harAtlas.removeLicence', async function () {
    const st = await app.licence.peek();
    if (!st.hasKey) { info(NAME + ': No licence key is stored on this computer, so there is nothing to remove.'); return; }
    const pick = await vscode.window.showWarningMessage(NAME + ': ' + messages.removeConfirmText(), { modal: true }, BUTTONS.remove);
    if (pick !== BUTTONS.remove) return;
    const result = await app.licence.remove();
    info(NAME + ': ' + (result.deactivated
      ? 'The licence was removed from this computer and the activation was freed. You can enter the key on another computer now.'
      : 'The licence was removed from this computer. The licence server could not be reached, so the activation may still count against the limit of ' + config.activationLimit + '; if a later activation is refused, contact ' + config.supportContact() + '.'));
  });

  return ui.disposables;
}

module.exports = { registerCommands: registerCommands };
