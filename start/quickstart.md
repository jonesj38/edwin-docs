---
summary: "Install Edwin, onboard the Gateway, and pair your first channel."
read_when:
  - You want the fastest path from install to a working Gateway
title: "Quick start"
---

<Note>
Edwin requires Node 22 or newer.
</Note>

## Install

<Tabs>
  <Tab title="npm">
    ```bash
    npm install -g edwin@latest
    ```
  </Tab>
  <Tab title="pnpm">
    ```bash
    pnpm add -g edwin@latest
    ```
  </Tab>
</Tabs>

## Onboard and run the Gateway

<Steps>
  <Step title="Onboard and install the service">
    ```bash
    edwin onboard --install-daemon
    ```
  </Step>
  <Step title="Pair WhatsApp">
    ```bash
    edwin channels login
    ```
  </Step>
  <Step title="Start the Gateway">
    ```bash
    edwin gateway --port 18789
    ```
  </Step>
</Steps>

After onboarding, the Gateway runs via the user service. You can still run it manually with `edwin gateway`.

<Info>
Switching between npm and git installs later is easy. Install the other flavor and run
`edwin doctor` to update the gateway service entrypoint.
</Info>

## From source (development)

```bash
git clone https://github.com/jonesj38/edwin.git
cd edwin
pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build
edwin onboard --install-daemon
```

If you do not have a global install yet, run onboarding via `pnpm edwin ...` from the repo.

## Multi instance quickstart (optional)

```bash
EDWIN_CONFIG_PATH=~/.edwin/a.json \
EDWIN_STATE_DIR=~/.edwin-a \
edwin gateway --port 19001
```

## Send a test message

Requires a running Gateway.

```bash
edwin message send --target +15555550123 --message "Hello from Edwin"
```
