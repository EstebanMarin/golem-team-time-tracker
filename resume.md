# Session Resume — Golem Pi Deployment

## Goal
Run the Golem backend (WASM, TypeScript) on a Raspberry Pi as a persistent shared server.
Team members point their `tt` CLI at the Pi's IP instead of localhost.

## Architecture
- **Backend**: TypeScript → WASM via Golem SDK. Architecture-neutral once compiled.
- **Golem server**: The `golem` binary hosts and runs the WASM agents with durable state.
- **CLI (`tt`)**: Connects to Golem server over HTTP on port 9006. Config at `~/.config/tt/config.json`.
- **Flake**: Already has `aarch64-linux` entries in `flake.nix` but with `pkgs.lib.fakeHash` placeholders — needs real SHA256s before `nix develop` works on the Pi.

## What Was Done
- Flashed Raspberry Pi OS Lite (32-bit, armhf) to SD card — worked but wrong architecture.
- Configured headless SSH via cloud-init (`/boot/user-data`): user `nix`, password `golem`, avahi-daemon for mDNS.
- SSHed in successfully at `192.168.0.25`.
- Discovered Determinate Systems Nix installer has no `armv7l` build.
- Discovered Golem binary is `aarch64` only — 32-bit OS is incompatible.
- Downloaded and flashed 64-bit Pi OS Lite (arm64, 2026-04-21).
- Pi shows rainbow screen on boot — current Pi hardware does not support 64-bit.

## Blocking Issue
**The Pi model in hand is too old** — it's 32-bit only (likely Pi 1, 2, or Zero W).
The Golem binary is `aarch64-unknown-linux-gnu` and will not run on 32-bit ARM.

## Next Steps (once 64-bit Pi is available)

### 1. Flash SD card (same process)
```bash
xzcat ~/Downloads/2026-04-21-raspios-trixie-arm64-lite.img.xz | sudo dd of=/dev/sda bs=4M status=progress conv=fsync
```

### 2. Write headless cloud-init config to `/boot/user-data`
User: `nix`, password: `golem`, SSH enabled, avahi-daemon installed.
Password hash: `$6$qgUElLcRGSiQoJkQ$Hrk4E2UjSqlXVTDRe7Vgva/mjnUCZtPlivoHar1EU4LTz7kdOrG9jyNgozHaviUbCVsHp9w.cU5J0K0IMrzt70`

### 3. Install Nix on Pi
```bash
ssh nix@<pi-ip>
curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix -o /tmp/nix-install.sh
_ansi_escapes_are_valid=false bash /tmp/nix-install.sh install --no-confirm
```

### 4. Fix flake.nix aarch64 hashes
```bash
nix-prefetch-url https://github.com/golemcloud/golem/releases/download/v1.5.0-rc3/golem-aarch64-unknown-linux-gnu
nix-prefetch-url https://github.com/golemcloud/golem/releases/download/v1.5.0-rc3/golem-cli-aarch64-unknown-linux-gnu
```
Replace `pkgs.lib.fakeHash` in `flake.nix` lines 31 and 35.

### 5. Clone repo + enter dev shell on Pi
```bash
git clone <repo> && cd golem-team-time-tracker
nix develop
```

### 6. Start Golem server on Pi
```bash
mkdir -p ~/golem-data
golem server run --data-dir ~/golem-data
```

### 7. Add `pi` environment to `backend/golem.yaml`
```yaml
environments:
  pi:
    server: pi
    componentPresets: release

httpApi:
  deployments:
    pi:
    - domain: 192.168.0.25:9006
      agents:
        MemberAgent: {}
        TeamAgent: {}
```

### 8. Deploy backend from dev machine
```bash
cd backend
golem app build
golem app deploy --environment pi
```

### 9. Team onboarding
```bash
tt init --member-id <id> --member-name "Alice" --server http://192.168.0.25:9006
tt team register <id> "Alice"
```

## Compatible Pi Models (64-bit required)
- Pi 3 Model B / B+
- Pi 4 (any RAM)
- Pi 5
- Pi Zero 2 W
