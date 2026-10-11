import { describe, it, expect } from '@jest/globals';
import { marroneToOpenCollection } from '../../src/opencollection/marrone-to-opencollection';
import { openCollectionToMarrone } from '../../src/opencollection/opencollection-to-marrone';

const syncConfig = {
  sourceUrl: 'https://petstore3.swagger.io/api/v3/openapi.json',
  groupBy: 'tags',
  lastSyncDate: '2026-08-13T10:00:00.000Z',
  specHash: 'd41d8cd98f00b204e9800998ecf8427e',
  autoCheck: false,
  autoCheckInterval: 15
};

describe('marroneToOpenCollection (export): openapi sync config', () => {
  it('writes the sync config under extensions.marrone.openapi', () => {
    const oc = marroneToOpenCollection({
      name: 'Petstore',
      brunoConfig: { openapi: [syncConfig] },
      items: []
    });
    expect(oc.extensions?.marrone?.openapi).toEqual([syncConfig]);
  });

  it('writes nothing when the collection has no sync config', () => {
    const withoutKey = marroneToOpenCollection({ name: 'API', brunoConfig: {}, items: [] });
    const withEmptyList = marroneToOpenCollection({ name: 'API', brunoConfig: { openapi: [] }, items: [] });
    expect(withoutKey.extensions?.marrone?.openapi).toBeUndefined();
    expect(withEmptyList.extensions?.marrone?.openapi).toBeUndefined();
  });

  it('skips malformed entries and keeps the usable ones', () => {
    const oc = marroneToOpenCollection({
      name: 'Petstore',
      brunoConfig: { openapi: [null, 'https://example.com/openapi.json', syncConfig] },
      items: []
    });
    expect(oc.extensions.marrone.openapi).toEqual([syncConfig]);
  });

  it('omits sync metadata that is absent and defaults the auto-check fields', () => {
    const oc = marroneToOpenCollection({
      name: 'Petstore',
      brunoConfig: { openapi: [{ sourceUrl: 'https://example.com/openapi.json', groupBy: 'path' }] },
      items: []
    });
    expect(oc.extensions.marrone.openapi).toEqual([
      {
        sourceUrl: 'https://example.com/openapi.json',
        groupBy: 'path',
        autoCheck: true,
        autoCheckInterval: 5
      }
    ]);
  });
});

describe('openCollectionToMarrone (import): openapi sync config', () => {
  it('reads the sync config back, defaulting the auto-check fields', () => {
    const { brunoConfig } = openCollectionToMarrone({
      opencollection: '1.0.0',
      info: { name: 'Petstore' },
      extensions: { marrone: { openapi: [{ sourceUrl: 'https://example.com/openapi.json', groupBy: 'tags' }] } }
    });
    expect(brunoConfig.openapi).toEqual([
      {
        sourceUrl: 'https://example.com/openapi.json',
        groupBy: 'tags',
        autoCheck: true,
        autoCheckInterval: 5
      }
    ]);
  });

  it('skips malformed entries and keeps the usable ones', () => {
    const { brunoConfig } = openCollectionToMarrone({
      opencollection: '1.0.0',
      info: { name: 'Petstore' },
      extensions: { marrone: { openapi: [null, 'https://example.com/openapi.json', syncConfig] } }
    });
    expect(brunoConfig.openapi).toEqual([syncConfig]);
  });

  it('leaves the collection unlinked when the file carries no sync config', () => {
    const { brunoConfig } = openCollectionToMarrone({
      opencollection: '1.0.0',
      info: { name: 'API' }
    });
    expect(brunoConfig.openapi).toBeUndefined();
  });
});

describe('openapi sync config: export then import keeps it the same', () => {
  it('preserves the sync config across a round trip', () => {
    const oc = marroneToOpenCollection({
      name: 'Petstore',
      brunoConfig: { openapi: [syncConfig] },
      items: []
    });
    const { brunoConfig } = openCollectionToMarrone(oc);
    expect(brunoConfig.openapi).toEqual([syncConfig]);
  });
});
