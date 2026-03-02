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
          otherCflags = ['$(inherited)'];
        }
        
        // Ensure it's an array for consistent processing
        if (typeof otherCflags === 'string') {
          // Split by space but respect quoted strings if necessary
          // For simplicity, if it's a string we'll just check if it contains the flag
          if (!otherCflags.includes('-Wno-deprecated-declarations')) {
            buildConfig.buildSettings.OTHER_CFLAGS = `${otherCflags} -Wno-deprecated-declarations`;
          }
        } else if (Array.isArray(otherCflags)) {
          if (!otherCflags.includes('-Wno-deprecated-declarations')) {
            otherCflags.push('-Wno-deprecated-declarations');
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
