const path = require('node:path');

const iconPath = path.join(__dirname, 'assets', 'icon');

module.exports = {
  packagerConfig: {
    asar: true,
    executableName: 'Avocado',
    icon: iconPath,
    name: 'Avocado',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'avocado',
        setupIcon: `${iconPath}.ico`,
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
};
