// Unit tests for handler.js routing
const { handler, listLetterTypes, generateLetter, downloadPdf } = require('./handler');

// Mock dependencies to avoid real I/O and network calls
jest.mock('./llmClient', () => ({
  enhance: jest.fn().mockResolvedValue(null),
}));

jest.mock('./storage', () => ({
  save: jest.fn().mockResolvedValue({ mdPath: '/tmp/test.md', pdfPath: '/tmp/test.pdf' }),
}));

// pdfGenerator is real (uses pdfkit) — keep it real for integration confidence

describe('listLetterTypes', () => {
  test('returns 200 with letterTypes array', () => {
    const response = listLetterTypes();
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(Array.isArray(body.letterTypes)).toBe(true);
    expect(body.letterTypes.length).toBeGreaterThan(0);
  });

  test('each letter type has id, displayName, and fields', () => {
    const response = listLetterTypes();
    const { letterTypes } = JSON.parse(response.body);
    for (const lt of letterTypes) {
      expect(typeof lt.id).toBe('string');
      expect(typeof lt.displayName).toBe('string');
      expect(Array.isArray(lt.fields)).toBe(true);
    }
  });

  test('does not expose template text', () => {
    const response = listLetterTypes();
    const { letterTypes } = JSON.parse(response.body);
    for (const lt of letterTypes) {
      expect(lt.template).toBeUndefined();
    }
  });

  test('includes event-hosting-request and support-request-letter', () => {
    const response = listLetterTypes();
    const { letterTypes } = JSON.parse(response.body);
    const ids = letterTypes.map((lt) => lt.id);
    expect(ids).toContain('event-hosting-request');
    expect(ids).toContain('support-request-letter');
  });
});

describe('generateLetter', () => {
  const eventFields = {
    institution_name: 'City Hall',
    facility_name: 'Main Auditorium',
    event_name: 'Annual Gala',
    event_description: 'A community celebration',
    event_date: '2025-12-01',
    event_time: '18:00',
    expected_participants: '200',
    organizer_name: 'Jane Doe',
    organization_name: 'Community Org',
    contact_info: 'jane@example.com',
    additional_requests: 'None',
  };

  const supportFields = {
    institution_name: 'City Hall',
    project_name: 'Green Initiative',
    project_description: 'A sustainability project',
    support_type: 'Financial',
    resources_needed: 'Funding and volunteers',
    organizer_name: 'John Smith',
    organization_name: 'Green Org',
    contact_info: 'john@example.com',
  };

  test('POST /generate with valid Event Hosting Request fields returns rendered text', async () => {
    const response = await generateLetter({ letterTypeId: 'event-hosting-request', fields: eventFields });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(typeof body.letterText).toBe('string');
    expect(body.letterText.length).toBeGreaterThan(0);
    expect(typeof body.llmEnhanced).toBe('boolean');
  });

  test('POST /generate with valid Support Request fields returns rendered text', async () => {
    const response = await generateLetter({ letterTypeId: 'support-request-letter', fields: supportFields });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(typeof body.letterText).toBe('string');
    expect(body.letterText.length).toBeGreaterThan(0);
  });

  test('returns 400 for unknown letter type ID', async () => {
    const response = await generateLetter({ letterTypeId: 'nonexistent-type', fields: {} });
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(typeof body.error).toBe('string');
  });

  test('returns 400 when letterTypeId is missing', async () => {
    const response = await generateLetter({});
    expect(response.statusCode).toBe(400);
  });

  test('returns 400 when required fields are missing', async () => {
    const response = await generateLetter({ letterTypeId: 'event-hosting-request', fields: {} });
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toMatch(/missing/i);
  });
});

describe('downloadPdf', () => {
  test('returns 200 with application/pdf content type', async () => {
    const response = await downloadPdf({ letterText: 'Dear Sir, This is a test letter.' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['Content-Type']).toBe('application/pdf');
  });

  test('returns Content-Disposition: attachment header', async () => {
    const response = await downloadPdf({ letterText: 'Test letter content.' });
    expect(response.headers['Content-Disposition']).toBe('attachment');
  });

  test('returns 400 when letterText is missing', async () => {
    const response = await downloadPdf({});
    expect(response.statusCode).toBe(400);
  });
});

describe('handler routing', () => {
  test('GET /letter-types routes correctly', async () => {
    const event = { httpMethod: 'GET', path: '/letter-types' };
    const response = await handler(event, {});
    expect(response.statusCode).toBe(200);
  });

  test('unknown route returns 400', async () => {
    const event = { httpMethod: 'GET', path: '/unknown' };
    const response = await handler(event, {});
    expect(response.statusCode).toBe(400);
  });

  test('POST /generate with valid body routes correctly', async () => {
    const eventFields = {
      institution_name: 'City Hall',
      facility_name: 'Main Auditorium',
      event_name: 'Annual Gala',
      event_description: 'A community celebration',
      event_date: '2025-12-01',
      event_time: '18:00',
      expected_participants: '200',
      organizer_name: 'Jane Doe',
      organization_name: 'Community Org',
      contact_info: 'jane@example.com',
      additional_requests: 'None',
    };
    const event = {
      httpMethod: 'POST',
      path: '/generate',
      body: JSON.stringify({ letterTypeId: 'event-hosting-request', fields: eventFields }),
    };
    const response = await handler(event, {});
    expect(response.statusCode).toBe(200);
  });

  test('POST /download-pdf with valid body routes correctly', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/download-pdf',
      body: JSON.stringify({ letterText: 'Test letter.' }),
    };
    const response = await handler(event, {});
    expect(response.statusCode).toBe(200);
  });
});
