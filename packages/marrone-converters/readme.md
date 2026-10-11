# marrone-converters

The converters package is responsible for converting collections from one format to a Marrone collection.
It can be used as a standalone package or as a part of the Marrone framework.

## Installation

```bash
npm install @marrone/converters
```

## Usage

### Convert Postman collection to Marrone collection

```javascript
const { postmanToMarrone } = require('@marrone/converters');

// Convert Postman collection to Marrone collection
const marroneCollection = postmanToMarrone(postmanCollection);
```

### Convert Postman Environment to Marrone Environment

```javascript
const { postmanToMarroneEnvironment } = require('@marrone/converters');

const marroneEnvironment = postmanToMarroneEnvironment(postmanEnvironment);
```

### Convert Insomnia collection to Marrone collection

```javascript
const { insomniaToMarrone } = require('@marrone/converters');

const marroneCollection = insomniaToMarrone(insomniaCollection);
```

### Convert OpenAPI specification to Marrone collection

```javascript
const { openApiToMarrone } = require('@marrone/converters');

const marroneCollection = openApiToMarrone(openApiSpecification);
```

### Convert WSDL file to Marrone collection

```javascript
import { wsdlToMarrone } from '@marrone/converters';

const marroneCollection = await wsdlToMarrone(wsdlContent);
```

## Example 

```javascript

const { postmanToMarrone } = require('@marrone/converters');
const fs = require('fs/promises');
const path = require('path');

async function convertPostmanToBruno(inputFile, outputFile) {
  try {
    // Read Postman collection file
    const inputData = await fs.readFile(inputFile, 'utf8');
    
    // Convert to Marrone collection
    const marroneCollection = await postmanToMarrone(JSON.parse(inputData));
    
    // Save Marrone collection
    await fs.writeFile(outputFile, JSON.stringify(marroneCollection, null, 2));
    
    console.log('Conversion successful!');
  } catch (error) {
    console.error('Error during conversion:', error);
  }
}

// Usage
const inputFilePath = path.resolve(__dirname, 'demo_collection.postman_collection.json');
const outputFilePath = path.resolve(__dirname, 'bruno-collection.json');

convertPostmanToBruno(inputFilePath, outputFilePath);

``` 

## WSDL Import Features

The WSDL importer supports the following features:

- **Service Discovery**: Automatically extracts service endpoints from WSDL definitions
- **Operation Mapping**: Converts WSDL operations to Marrone HTTP requests
- **SOAP Envelope Generation**: Creates proper SOAP envelopes for each operation
- **Header Configuration**: Sets up appropriate Content-Type and SOAPAction headers
- **Environment Variables**: Creates environment variables for service base URLs
- **Folder Organization**: Groups operations by port type for better organization

### WSDL Import Example

```javascript
import { wsdlToMarrone } from '@marrone/converters';
import fs from 'fs/promises';

async function importWSDL() {
  try {
    // Read WSDL file
    const wsdlContent = await fs.readFile('service.wsdl', 'utf8');
    
    // Convert to Marrone collection
    const marroneCollection = await wsdlToMarrone(wsdlContent);
    
    // Save Marrone collection
    await fs.writeFile('soap-collection.json', JSON.stringify(marroneCollection, null, 2));
    
    console.log('WSDL import successful!');
  } catch (error) {
    console.error('Error during WSDL import:', error);
  }
}

importWSDL();
```

### CLI Usage

You can also use the Marrone CLI to import WSDL files:

```bash
# Import WSDL file to a directory
marrone import wsdl --source service.wsdl --output ~/Desktop/soap-collection --collection-name "SOAP Service"

# Import WSDL from URL
marrone import wsdl --source https://example.com/service.wsdl --output ~/Desktop --collection-name "Remote SOAP Service"

# Import WSDL and save as JSON file
marrone import wsdl --source service.wsdl --output-file ~/Desktop/soap-collection.json --collection-name "SOAP Service"
```

## Supported Formats

- **Postman Collections** (v2.1)
- **Insomnia Collections** (v4 and v5)
- **OpenAPI Specifications** (v3.0)
- **WSDL Files** (Web Services Description Language)

## Dependencies

- `lodash` - Utility functions
- `nanoid` - UUID generation
- `js-yaml` - YAML parsing
- `xml2js` - XML parsing for WSDL
- `@marrone/schema` - Schema validation
