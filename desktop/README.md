# Avocado Desktop

Electron shell for the existing React client and NestJS server. The desktop
application starts the API on a free loopback port and stores its SQLite
database in Electron's per-user application data directory.

## Development

From the repository root, install dependencies in all packages:

```powershell
npm install
npm run setup
```

Start the web client and API together:

```powershell
npm run dev
```

Build the web client and API:

```powershell
npm run build
```

Build and start the desktop application:

```powershell
npm run start:desktop
```

The desktop start command creates a packaged development build before launching
it so that the native SQLite driver uses the correct Electron ABI.

## Packaging for Windows

Increase the application version before a release. Use `version:patch` for a
regular release, or `version:minor` for a larger release within version 5:

```powershell
npm run version:patch
```

Then build the installer:

```powershell
npm run make:desktop
```

Electron Forge writes the versioned installer, for example
`Avocado-5.0.1 Setup.exe`, to `desktop/out/make/`.
