// PKF Remark Configuration
// Uses generated path-schema mappings for frontmatter validation

import remarkFrontmatter from 'remark-frontmatter';
import remarkLintFrontmatterSchema from 'remark-lint-frontmatter-schema';
import remarkValidateLinks from 'remark-validate-links';

// Import generated mappings (run `npm run pkf:build` first)
let pathSchemaMap = {};
try {
  const { default: generated } = await import('./.pkf/generated/path-schema-map.json', {
    with: { type: 'json' },
  });
  pathSchemaMap = generated.mappings || {};
} catch {
  console.warn('Warning: No generated path-schema-map.json found. Run npm run pkf:build first.');
}

const remarkConfig = {
  plugins: [
    remarkFrontmatter,
    [
      remarkLintFrontmatterSchema,
      {
        schemas: pathSchemaMap,
      },
    ],
    remarkValidateLinks,
  ],
};

export default remarkConfig;
