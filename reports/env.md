# Environment notes (architect#0, Wave 0)

- **Host:** Kali GNU/Linux Rolling 2026.3, Node 24.21.0, npm 12.0.2.
- **Toolchain:** TypeScript 7.0.2 (native `tsc`), Vite 8.3.4, vite-plugin-singlefile 2.3.3, Vitest 5.0.4, Playwright 1.64.0, tsx 4.23.
- **Playwright browsers:** Chromium 1248 and WebKit 2370 downloaded (Playwright warns Kali is unsupported and uses the ubuntu24.04-x64 fallback builds).

## Chromium: works

`npm run e2e`, `npm run shots` and `npm run art:sheet` run fine on Chromium.

## WebKit: downloaded but cannot launch (missing system libraries)

Exact launch error from `npm run e2e` (webkit project):

```
Error: browserType.launch:
Host system is missing dependencies to run browsers.
Please install them with the following command:
    sudo npx playwright install-deps
Alternatively, use apt:
    sudo apt-get install libicu74 libxml2 libjpeg-turbo8
```

`ldd` on the WebKit bundle (`~/.cache/ms-playwright/webkit-2370`), after excluding libs it bundles itself, shows these sonames missing:

| Missing soname | What Kali has instead |
| --- | --- |
| `libicuuc.so.74`, `libicui18n.so.74`, `libicudata.so.74` | ICU 72 and 78 |
| `libjpeg.so.8` | `libjpeg.so.62` |
| `libxml2.so.2` | `libxml2.so.16` (new ABI) |

`npx playwright install-deps --dry-run webkit` (exit 1):

```
BEWARE: your OS is not officially supported by Playwright; installing dependencies for ubuntu24.04-x64 as a fallback.
Failed to install browser dependencies
Error: 'apt-get install -s' exited with code 100:
E: Package 'libicu74' has no installation candidate
E: Package 'libjpeg-turbo8' has no installation candidate
E: Unable to locate package libvpx9
E: Package 'libxml2' has no installation candidate
E: Unable to locate package libx264-164
```

So even with sudo, apt cannot satisfy them on Kali: the Ubuntu 24.04 package names do not exist here.

## Workaround in place

- The WebKit project stays defined in `playwright.config.ts`. Set `EP_SKIP_WEBKIT=1` to drop it:
  `EP_SKIP_WEBKIT=1 npm run e2e` and `EP_SKIP_WEBKIT=1 npm run shots`.
- Possible fixes for the user (not done, no sudo used): run WebKit e2e in the official Playwright Docker image (`mcr.microsoft.com/playwright`), on a Mac, or provide the three sonames (ICU 74, libjpeg-turbo 8, libxml2 2.x) from Ubuntu 24.04 `.deb`s unpacked into a private dir on `LD_LIBRARY_PATH`.
- Until then WebKit (her Safari stand-in) is untested here; the final `file://` check in Safari should be done by hand on a Mac.
