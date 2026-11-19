import { access, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { chromium, webkit } from 'playwright';

export const browserNames = ['chromium', 'chrome', 'msedge', 'vivaldi', 'webkit'];

export async function launchBrowser() {
  const name = process.env.ODIN_UI_BROWSER ?? 'chromium';
  if (!browserNames.includes(name)) throw new Error(`Unknown browser ${name}; choose ${browserNames.join(', ')}`);
  const type = name === 'webkit' ? webkit : chromium;
  const options = { headless: true };
  // Vivaldi's desktop UI stalls creation of isolated Playwright pages in headless
  // mode. Its own executable/renderer is still used; record this launch condition.
  if (name === 'vivaldi') options.args = ['--disable-vivaldi'];
  const customPaths = {
    chrome: process.env.ODIN_CHROME_EXECUTABLE,
    msedge: process.env.ODIN_EDGE_EXECUTABLE,
    vivaldi: process.env.ODIN_VIVALDI_EXECUTABLE,
  };
  if (customPaths[name]) options.executablePath = customPaths[name];
  else if (name === 'chrome' || name === 'msedge') options.channel = name;
  else if (name === 'vivaldi') {
    const candidates = process.platform === 'darwin'
      ? ['/Applications/Vivaldi.app/Contents/MacOS/Vivaldi']
      : process.platform === 'win32'
        ? [`${process.env.LOCALAPPDATA}/Vivaldi/Application/vivaldi.exe`, `${process.env.ProgramFiles}/Vivaldi/Application/vivaldi.exe`]
        : ['/opt/vivaldi/vivaldi', '/usr/bin/vivaldi-stable', '/usr/bin/vivaldi'];
    for (const candidate of candidates) {
      try { await access(candidate, constants.X_OK); options.executablePath = candidate; break; } catch { /* Try the next standard install location. */ }
    }
    if (!options.executablePath) throw new Error('Vivaldi is not installed. Set ODIN_VIVALDI_EXECUTABLE to its executable; Chromium is never substituted.');
  }
  const browser = await type.launch(options);
  const identity = {
    requested: name,
    engine: type.name(),
    version: browser.version(),
    channel: options.channel ?? null,
    executable: options.executablePath ?? null,
    platform: process.platform,
    headless: true,
    vivaldiDesktopUiDisabled: name === 'vivaldi',
    safariApplication: false,
  };
  console.log(`Browser: ${JSON.stringify(identity)}`);
  if (process.env.ODIN_UI_BROWSER_METADATA) await writeFile(process.env.ODIN_UI_BROWSER_METADATA, JSON.stringify(identity, null, 2) + '\n');
  return browser;
}
