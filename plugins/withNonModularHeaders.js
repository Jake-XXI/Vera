// plugins/withNonModularHeaders.js
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withNonModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      if (!fs.existsSync(podfilePath)) return cfg;

      let podfile = fs.readFileSync(podfilePath, "utf8");

      // 1️⃣ Ensure use_modular_headers! exists
      if (!podfile.includes("use_modular_headers!")) {
        podfile = podfile.replace(
          /^platform :ios,.*$/m,
          (match) => `${match}\nuse_modular_headers!`
        );
      }

      // 2️⃣ Ensure a SINGLE post_install block exists with our config INSIDE it
      if (!podfile.includes("CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES")) {
        const postInstallBlock = `
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
  end
end
`;

        // Remove any existing post_install blocks (Expo regenerates safely)
        podfile = podfile.replace(/post_install do \|installer\|[\s\S]*?end\n?/g, "");

        // Append our known-good post_install
        podfile += `\n${postInstallBlock}`;
      }

      fs.writeFileSync(podfilePath, podfile);
      return cfg;
    },
  ]);
};
