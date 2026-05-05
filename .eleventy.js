module.exports = function (eleventyConfig) {
  // Pass through static assets
  eleventyConfig.addPassthroughCopy("src/assets");

  // Date formatting filter
  eleventyConfig.addFilter("dateFormat", (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  });

  // Split a comma-separated string into an array
  eleventyConfig.addFilter("split", (str, sep) => {
    if (!str) return [];
    return str.split(sep || ",").map((s) => s.trim());
  });

  // Group an array by a property
  eleventyConfig.addFilter("groupBy", (arr, key) => {
    if (!arr) return {};
    return arr.reduce((groups, item) => {
      const val = item[key] || "Other";
      if (!groups[val]) groups[val] = [];
      groups[val].push(item);
      return groups;
    }, {});
  });

  // Convert teacher name to pencil sketch image path
  eleventyConfig.addFilter("teacherImage", (name) => {
    if (!name) return "";
    const slug = name
      .replace(/\./g, "")          // remove periods (R.C. -> RC)
      .replace(/\s+/g, "_")        // spaces to underscores
      .replace(/[^a-zA-Z0-9_-]/g, ""); // remove other special chars
    return `/assets/images/teachers/${slug}_pencil.png`;
  });

  // Markdown rendering for long-text fields
  const markdownIt = require("markdown-it");
  const md = markdownIt({ html: true, breaks: true });
  eleventyConfig.addFilter("markdown", (content) => {
    if (!content) return "";
    return md.render(content);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "../_data",
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
