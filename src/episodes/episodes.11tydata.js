module.exports = {
    layout: "episode.njk",
    eleventyComputed: {
          title: (data) => data.question,
          description: (data) =>
                  `${data.question} — exploring ${data.scripture} through multiple trusted teachers.`,
    },
};
