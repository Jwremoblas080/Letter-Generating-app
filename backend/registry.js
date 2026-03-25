// Template Registry — loads and exposes letter type definitions

/**
 * @typedef {Object} FieldDefinition
 * @property {string} key       - Placeholder key, e.g. "institution_name"
 * @property {string} label     - Human-readable label, e.g. "Institution Name"
 * @property {boolean} required
 */

/**
 * @typedef {Object} LetterTypeDefinition
 * @property {string} id            - Unique identifier, e.g. "event-hosting-request"
 * @property {string} displayName   - Human-readable name, e.g. "Event Hosting Request"
 * @property {string} template      - Letter text with {{placeholder}} tokens
 * @property {FieldDefinition[]} fields
 */

/**
 * @typedef {{ ok: true, text: string } | { ok: false, missingKeys: string[] }} RenderResult
 */

const templates = require('./templates/index');

/**
 * Return all registered letter types.
 * @returns {LetterTypeDefinition[]}
 */
function getAll() {
  return templates;
}

/**
 * Find a letter type by its id.
 * @param {string} id
 * @returns {LetterTypeDefinition|undefined}
 */
function getById(id) {
  return templates.find((t) => t.id === id);
}

module.exports = { templates, getAll, getById };
