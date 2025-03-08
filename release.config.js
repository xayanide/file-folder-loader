/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
    tagFormat: "${version}",
    branches: ["main", "dev"],
    plugins: [
        ["@semantic-release/commit-analyzer"],
        ["@semantic-release/release-notes-generator"],
        // { npmPublish } is disabled by default only if the "private" property
        // in package.json is true.
        ["@semantic-release/npm", { npmPublish: false }],
        ["@semantic-release/github"],
        [
            "@semantic-release/git",
            {
                assets: ["package.json", "package-lock.json"],
                /** Don't use [skip ci] because branch-syncer workflow would no longer work. */
                message: "chore(release): ${nextRelease.version}\n\n${nextRelease.notes}",
            },
        ],
    ],
};
