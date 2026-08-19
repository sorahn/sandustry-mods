const supported = /\.(?:ts|tsx|js|mjs|cjs|json)$/;

export default {
  "**/*": (files) => {
    const eligible = files.filter(
      (file) =>
        supported.test(file) &&
        file !== "package-lock.json" &&
        !file.startsWith("resources/") &&
        !file.includes("/build/"),
    );
    if (eligible.length === 0) return [];
    return `oxfmt --write ${eligible.map((file) => `'${file.replaceAll("'", "'\\''")}'`).join(" ")}`;
  },
};
