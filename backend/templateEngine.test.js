// Unit tests for templateEngine.js
const { render } = require('./templateEngine');

describe('templateEngine.render', () => {
  test('empty template renders to empty string without error', () => {
    const result = render('', {});
    expect(result).toEqual({ ok: true, text: '' });
  });

  test('template with no placeholders returns template unchanged', () => {
    const template = 'Hello, world!';
    const result = render(template, {});
    expect(result).toEqual({ ok: true, text: 'Hello, world!' });
  });

  test('substitutes a single placeholder', () => {
    const result = render('Hello, {{name}}!', { name: 'Alice' });
    expect(result).toEqual({ ok: true, text: 'Hello, Alice!' });
  });

  test('substitutes multiple placeholders', () => {
    const result = render('{{greeting}}, {{name}}!', { greeting: 'Hi', name: 'Bob' });
    expect(result).toEqual({ ok: true, text: 'Hi, Bob!' });
  });

  test('returns ok:false with missingKeys when placeholder has no value', () => {
    const result = render('Hello, {{name}}!', {});
    expect(result.ok).toBe(false);
    expect(result.missingKeys).toContain('name');
  });

  test('returns all unresolved placeholder keys', () => {
    const result = render('{{a}} and {{b}} and {{c}}', { a: 'x' });
    expect(result.ok).toBe(false);
    expect(result.missingKeys).toEqual(expect.arrayContaining(['b', 'c']));
    expect(result.missingKeys).not.toContain('a');
  });

  test('placeholder matching is case-sensitive', () => {
    const result = render('Hello, {{Name}}!', { name: 'Alice' });
    expect(result.ok).toBe(false);
    expect(result.missingKeys).toContain('Name');
  });

  test('substitutes the same placeholder appearing multiple times', () => {
    const result = render('{{x}} and {{x}}', { x: 'foo' });
    expect(result).toEqual({ ok: true, text: 'foo and foo' });
  });
});
