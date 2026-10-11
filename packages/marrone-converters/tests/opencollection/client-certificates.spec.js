import { describe, it, expect } from '@jest/globals';
import { marroneToOpenCollection } from '../../src/opencollection/marrone-to-opencollection';
import { openCollectionToMarrone } from '../../src/opencollection/opencollection-to-marrone';

describe('openCollectionToMarrone (import): client certificates', () => {
  it('maps pem/pkcs12 certificates to marrone cert/pfx types', () => {
    const { brunoConfig } = openCollectionToMarrone({
      opencollection: '1.0.0',
      info: { name: 'API' },
      config: {
        clientCertificates: [
          {
            domain: 'localhost',
            type: 'pem',
            certificateFilePath: './certs/client-cert.pem',
            privateKeyFilePath: './certs/client-key.pem',
            passphrase: 'secret'
          },
          {
            domain: 'example.com',
            type: 'pkcs12',
            pkcs12FilePath: './certs/client.pfx'
          }
        ]
      }
    });

    expect(brunoConfig.clientCertificates.certs).toEqual([
      {
        domain: 'localhost',
        type: 'cert',
        certFilePath: './certs/client-cert.pem',
        keyFilePath: './certs/client-key.pem',
        passphrase: 'secret'
      },
      {
        domain: 'example.com',
        type: 'pfx',
        pfxFilePath: './certs/client.pfx',
        passphrase: ''
      }
    ]);
  });

  it('reads a per-cert disabled flag when set to true', () => {
    const { brunoConfig } = openCollectionToMarrone({
      opencollection: '1.0.0',
      info: { name: 'API' },
      config: {
        clientCertificates: [
          {
            domain: 'localhost',
            type: 'pem',
            certificateFilePath: './certs/client-cert.pem',
            privateKeyFilePath: './certs/client-key.pem',
            disabled: true
          },
          {
            domain: 'example.com',
            type: 'pkcs12',
            pkcs12FilePath: './certs/client.pfx'
          }
        ]
      }
    });

    expect(brunoConfig.clientCertificates.certs[0].disabled).toBe(true);
    expect(brunoConfig.clientCertificates.certs[1]).not.toHaveProperty('disabled');
  });
});

describe('marroneToOpenCollection (export): client certificates', () => {
  it('maps marrone cert/pfx certificates to pem/pkcs12 types', () => {
    const oc = marroneToOpenCollection({
      name: 'API',
      brunoConfig: {
        clientCertificates: {
          certs: [
            {
              domain: 'localhost',
              type: 'cert',
              certFilePath: './certs/client-cert.pem',
              keyFilePath: './certs/client-key.pem',
              passphrase: 'secret'
            },
            {
              domain: 'example.com',
              type: 'pfx',
              pfxFilePath: './certs/client.pfx',
              passphrase: ''
            }
          ]
        }
      },
      items: []
    });

    expect(oc.config.clientCertificates).toEqual([
      {
        domain: 'localhost',
        type: 'pem',
        certificateFilePath: './certs/client-cert.pem',
        privateKeyFilePath: './certs/client-key.pem',
        passphrase: 'secret'
      },
      {
        domain: 'example.com',
        type: 'pkcs12',
        pkcs12FilePath: './certs/client.pfx'
      }
    ]);
  });

  it('writes disabled: true only for disabled certs and omits it otherwise', () => {
    const oc = marroneToOpenCollection({
      name: 'API',
      brunoConfig: {
        clientCertificates: {
          certs: [
            {
              domain: 'localhost',
              type: 'cert',
              certFilePath: './certs/client-cert.pem',
              keyFilePath: './certs/client-key.pem',
              disabled: true
            },
            {
              domain: 'example.com',
              type: 'pfx',
              pfxFilePath: './certs/client.pfx'
            }
          ]
        }
      },
      items: []
    });

    expect(oc.config.clientCertificates[0].disabled).toBe(true);
    expect(oc.config.clientCertificates[1]).not.toHaveProperty('disabled');
  });
});

describe('client certificates: round-trip', () => {
  it('export then import keeps every certificate field, including the disabled flag', () => {
    const certs = [
      {
        domain: 'localhost',
        type: 'cert',
        certFilePath: './certs/client-cert.pem',
        keyFilePath: './certs/client-key.pem',
        passphrase: 'secret',
        disabled: true
      },
      {
        domain: 'example.com',
        type: 'pfx',
        pfxFilePath: './certs/client.pfx',
        passphrase: 'pfx-secret'
      }
    ];

    const oc = marroneToOpenCollection({
      name: 'API',
      brunoConfig: { clientCertificates: { certs } },
      items: []
    });

    const { brunoConfig } = openCollectionToMarrone(oc);

    expect(brunoConfig.clientCertificates.certs).toEqual(certs);
  });

  it('import then export keeps every certificate field, including the disabled flag', () => {
    const clientCertificates = [
      {
        domain: 'localhost',
        type: 'pem',
        certificateFilePath: './certs/client-cert.pem',
        privateKeyFilePath: './certs/client-key.pem',
        passphrase: 'secret',
        disabled: true
      },
      {
        domain: 'example.com',
        type: 'pkcs12',
        pkcs12FilePath: './certs/client.pfx',
        passphrase: 'pfx-secret'
      }
    ];

    const marrone = openCollectionToMarrone({
      opencollection: '1.0.0',
      info: { name: 'API' },
      config: { clientCertificates }
    });

    const oc = marroneToOpenCollection(marrone);

    expect(oc.config.clientCertificates).toEqual(clientCertificates);
  });
});
