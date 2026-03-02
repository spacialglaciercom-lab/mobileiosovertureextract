const { withXcodeProject } = require('@expo/config-plugins');

const withSuppressWarnings = (config) => {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const buildConfigurations = xcodeProject.pbxXCBuildConfigurationSection();
    
    for (const key in buildConfigurations) {
      const buildConfig = buildConfigurations[key];
      if (typeof buildConfig === 'object' && buildConfig.buildSettings) {
        // Handle OTHER_CFLAGS which can be a string or an array
        let otherCflags = buildConfig.buildSettings.OTHER_CFLAGS;

        if (!otherCflags) {
          // Use quoted strings for pbxproj compatibility with Xcode 26 / nanaimo parser
          otherCflags = ['"$(inherited)"'];
        }
        
        // Ensure it's an array for consistent processing
        if (typeof otherCflags === 'string') {
          if (!otherCflags.includes('-Wno-deprecated-declarations')) {
            buildConfig.buildSettings.OTHER_CFLAGS = `${otherCflags} -Wno-deprecated-declarations`;
          }
        } else if (Array.isArray(otherCflags)) {
          // Ensure $(inherited) is quoted for pbxproj compatibility
          otherCflags = otherCflags.map(flag => {
            if (flag === '$(inherited)') {
              return '"$(inherited)"';
            }
            return flag;
          });
          
          if (!otherCflags.some(f => f.includes('-Wno-deprecated-declarations'))) {
            otherCflags.push('"-Wno-deprecated-declarations"');
          }
          buildConfig.buildSettings.OTHER_CFLAGS = otherCflags;
        }

        // Ensure warnings are not treated as errors to prevent build breaks
        buildConfig.buildSettings.GCC_TREAT_WARNINGS_AS_ERRORS = 'NO';
        buildConfig.buildSettings.SWIFT_TREAT_WARNINGS_AS_ERRORS = 'NO';
      }
    }
    
    return config;
  });
};

module.exports = withSuppressWarnings;
