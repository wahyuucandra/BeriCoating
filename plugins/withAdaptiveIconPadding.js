const { withDangerousMod } = require("@expo/config-plugins");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * Adds safe-zone padding to Android adaptive icon foreground images
 * by shrinking the content to 68% and centering on the original canvas.
 * This prevents the logo from touching the icon edges on any launcher.
 */
const withAdaptiveIconPadding = (config) => {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const resPath = path.join(
        config.modRequest.platformProjectRoot,
        "app", "src", "main", "res"
      );

      // Find all mipmap density dirs
      const mipmapDirs = fs.readdirSync(resPath).filter(
        (d) => d.startsWith("mipmap-") && !d.includes("anydpi")
      );

      mipmapDirs.forEach((dir) => {
        const fgPath = path.join(resPath, dir, "ic_launcher_foreground.webp");
        if (!fs.existsSync(fgPath)) return;

        try {
          // Resize the foreground to 90%
          execSync(
            `convert "${fgPath}" -resize 90% -gravity center -extent "$(identify -format '%wx%h' "${fgPath}")" "${fgPath}"`,
            { stdio: "pipe" }
          );
        } catch (e) {
          console.warn(`[withAdaptiveIconPadding] Skipped ${dir}: ${e.message}`);
        }
      });

      return config;
    },
  ]);
};

module.exports = withAdaptiveIconPadding;