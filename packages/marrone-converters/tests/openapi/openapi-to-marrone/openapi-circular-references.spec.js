import { describe, it, expect } from '@jest/globals';
import openApiToMarrone from '../../../src/openapi/openapi-to-marrone';

describe('openapi-circular-references', () => {
  it('should handle simple circular references in schema correctly', async () => {
    const marroneCollection = openApiToMarrone(circularRefsData);

    expect(marroneCollection).toMatchObject(circularRefsOutput);
  });

  it('should handle complex circular reference chains correctly', async () => {
    const marroneCollection = openApiToMarrone(complexCircularRefsData);

    expect(marroneCollection).toMatchObject(circularRefsOutput);
  });
});

const circularRefsData = {
  components: {
    schemas: {
      schema_1: {
        additionalProperties: false,
        description: 'schema_1',
        properties: {
          conditions: {
            $ref: '#/components/schemas/schema_1'
          }
        },
        type: 'object'
      },
      schema_2: {
        additionalProperties: false,
        description: 'schema_2',
        properties: {
          conditionGroup: {
            description: 'nested schema_1',
            items: { $ref: '#/components/schemas/schema_1' },
            type: 'array'
          },
          operation: {
            description: 'operation',
            enum: ['ANY', 'ALL'],
            type: 'string'
          }
        },
        type: 'object'
      }
    }
  },
  info: {
    description: 'circular reference openapi sample json spec',
    title: 'circular reference openapi sample json spec',
    version: '0.1'
  },
  openapi: '3.0.1',
  paths: {
    '/': {
      post: {
        deprecated: false,
        description: 'echo ping api',
        operationId: 'echo ping',
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/schema_1'
              }
            }
          },
          description: 'echo ping api',
          required: true
        },
        responses: {
          200: {
            content: {
              'application/json': {
                example: 'ping'
              }
            },
            description: 'Returned if the request is successful.'
          }
        }
      }
    }
  },
  servers: [{ url: 'https://echo.marrone.com' }]
};

// More complex circular reference test with a longer chain
const complexCircularRefsData = {
  components: {
    schemas: {
      schema_1: {
        additionalProperties: false,
        description: 'schema_1',
        properties: {
          conditionGroup: {
            description: 'nested schema_1',
            items: { $ref: '#/components/schemas/schema_2' },
            type: 'array'
          }
        },
        type: 'object'
      },
      schema_2: {
        additionalProperties: false,
        description: 'schema_2',
        properties: {
          conditionGroup: {
            description: 'nested schema_2',
            items: { $ref: '#/components/schemas/schema_3' },
            type: 'array'
          }
        },
        type: 'object'
      },
      schema_3: {
        additionalProperties: false,
        description: 'schema_3',
        properties: {
          conditionGroup: {
            description: 'nested schema_3',
            items: { $ref: '#/components/schemas/schema_4' },
            type: 'array'
          }
        },
        type: 'object'
      },
      schema_4: {
        additionalProperties: false,
        description: 'schema_4',
        properties: {
          conditionGroup: {
            description: 'nested schema_4',
            items: { $ref: '#/components/schemas/schema_5' },
            type: 'array'
          }
        },
        type: 'object'
      },
      schema_5: {
        additionalProperties: false,
        description: 'schema_4',
        properties: {
          conditionGroup: {
            description: 'nested schema_5',
            items: { $ref: '#/components/schemas/schema_1' },
            type: 'array'
          }
        },
        type: 'object'
      },
      schema_6: {
        additionalProperties: false,
        description: 'schema_3',
        properties: {
          conditionGroup: {
            description: 'nested schema_3',
            items: { $ref: '#/components/schemas/schema_1' },
            type: 'array'
          },
          operation: {
            description: 'operation',
            enum: ['ANY', 'ALL'],
            type: 'string'
          }
        },
        type: 'object'
      }
    }
  },
  info: {
    description: 'circular reference openapi sample json spec',
    title: 'circular reference openapi sample json spec',
    version: '0.1'
  },
  openapi: '3.0.1',
  paths: {
    '/': {
      post: {
        deprecated: false,
        description: 'echo ping api',
        operationId: 'echo ping',
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/schema_1'
              }
            }
          },
          description: 'echo ping api',
          required: true
        },
        responses: {
          200: {
            content: {
              'application/json': {
                example: 'ping'
              }
            },
            description: 'Returned if the request is successful.'
          }
        }
      }
    }
  },
  servers: [{ url: 'https://echo.marrone.com' }]
};

const circularRefsOutput = {
  environments: [
    {
      name: 'Environment 1',
      variables: [
        {
          enabled: true,
          name: 'baseUrl',
          secret: false,
          type: 'text',
          value: 'https://echo.marrone.com'
        }
      ]
    }
  ],
  items: [
    {
      name: 'echo ping',
      type: 'http-request',
      request: {
        url: '{{baseUrl}}/',
        method: 'POST',
        auth: {
          mode: 'inherit'
        },
        headers: [],
        params: [],
        body: {
          mode: 'json'
        }
      }
    }
  ],
  name: 'circular reference openapi sample json spec',
  version: '1'
};
