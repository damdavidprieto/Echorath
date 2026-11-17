// Starts the Chromium the tests run in:
//   1. CHROMIUM_PATH, when set;
//   2. otherwise /opt/pw-browsers/chromium, if that browser is installed;
//   3. otherwise the full Chromium that playwright-core installs
//      (npx playwright-core install --no-shell chromium). Not the reduced
//      headless shell: it handles touch differently (a tapped button is not
//      left hovered), and the tests check what real browsers do.
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PREINSTALLED = '/opt/pw-browsers/chromium';

export function chromiumPath() {
    if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
    return existsSync(PREINSTALLED) ? PREINSTALLED : undefined;
}

export function launchChromium(options = {}) {
    const executablePath = chromiumPath();
    return chromium.launch({ ...(executablePath ? { executablePath } : { channel: 'chromium' }), ...options });
}
