// Template Engine — placeholder substitution logic

/**
 * Render a template by substituting {{key}} placeholders with field values.
 * @param {string} template
 * @param {Record<string, string>} fields
 * @returns {import('./registry').RenderResult}
 */
function render(template, fields) {
  // Replace all {{key}} tokens with corresponding values (global, case-sensitive)
  const text = template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(fields, key) ? fields[key] : match;
  });

  // Scan for any remaining {{...}} tokens
  const remaining = text.match(/\{\{([^}]+)\}\}/g);
  if (remaining) {
    const missingKeys = remaining.map((token) => token.slice(2, -2));
    return { ok: false, missingKeys };
  }

  return { ok: true, text };
}

module.exports = { render };
