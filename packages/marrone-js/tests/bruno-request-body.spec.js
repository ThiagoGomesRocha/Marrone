const { describe, it, expect } = require('@jest/globals');
const MarroneRequest = require('../src/bruno-request');

const JSON_BODY = '{"name":"marrone"}';

const makeReq = (overrides = {}) => ({
  url: 'http://localhost:5000/api',
  method: 'POST',
  headers: {},
  data: JSON_BODY,
  ...overrides
});

describe('MarroneRequest - JSON body by Content-Type', () => {
  describe('getBody()', () => {
    it.each([
      'application/json',
      'application/json; charset=utf-8',
      'Application/JSON'
    ])('returns the parsed body when Content-Type is "%s"', (contentType) => {
      const req = new MarroneRequest(makeReq({ headers: { 'Content-Type': contentType } }));

      const body = req.getBody();

      expect(body).toEqual({ name: 'marrone' });
    });

    it('returns the raw string when only the multipart boundary contains "json"', () => {
      const req = new MarroneRequest(makeReq({ headers: { 'Content-Type': 'multipart/form-data; boundary=json-boundary' } }));

      const body = req.getBody();

      expect(body).toBe(JSON_BODY);
    });
  });

  describe('setBody()', () => {
    it('stringifies an object body when Content-Type is mixed-case JSON', () => {
      const rawReq = makeReq({ headers: { 'Content-Type': 'Application/JSON' } });
      const req = new MarroneRequest(rawReq);

      req.setBody({ name: 'marrone' });

      expect(rawReq.data).toBe(JSON_BODY);
    });

    it('keeps an object body as-is when only the multipart boundary contains "json"', () => {
      const rawReq = makeReq({ headers: { 'Content-Type': 'multipart/form-data; boundary=json-boundary' } });
      const req = new MarroneRequest(rawReq);
      const fields = { name: 'marrone' };

      req.setBody(fields);

      expect(rawReq.data).toBe(fields);
    });
  });
});
