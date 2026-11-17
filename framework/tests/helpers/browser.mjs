// Starts the Chromium the tests run in:
//   1. CHROMIUM_PATH, when set;
//   2. otherwise /opt/pw-browsers/chromium, if that browser is installed;
//   3. otherwise the one playwright-core installed
//      (npx playwright-core install chromium).
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PREINSTALLED = '/opt/pw-browsers/chromium';

export function chromiumPath() {
    if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
    return existsSync(PREINSTALLED) ? PREINSTALLED : undefined;
}

export const launchChromium = (options = {}) => chromium.launch({ executablePath: chromiumPath(), ...options });
