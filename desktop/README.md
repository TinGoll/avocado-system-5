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

Before updating an existing desktop installation, close the application and
back up its SQLite file from Electron's per-user `userData` directory. Database
migrations run on startup. Do not test destructive down migrations against a
user database.

The notification scheduler runs only while the embedded NestJS process is
alive. Closing the desktop application stops the server and its checks; after
the next launch the startup pass creates the currently applicable reminder,
without replaying every missed daily interval. Set
`NOTIFICATIONS_SCHEDULER_ENABLED=false` only for an additional server replica
that must not run the scheduler.

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
`Avocado 5-5.0.1 Setup.exe`, to `desktop/out/make/`.
