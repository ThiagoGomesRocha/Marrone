import { MarroneError } from 'utils/common/error';
import { postmanToMarroneEnvironment } from '@marrone/converters';
import { coerceEnvName, dedupeImportedSecrets } from 'utils/environments';

const importEnvironment = async (parsedFiles) => {
  try {
    const valid = [];
    const invalid = [];

    for (const parsedFile of parsedFiles) {
      try {
        const environment = postmanToMarroneEnvironment(parsedFile.content);
        const name = coerceEnvName(environment.name);
        if (name === null) {
          throw new MarroneError('Invalid environment: missing or invalid name');
        }
        valid.push({ ...environment, name, variables: dedupeImportedSecrets(environment.variables), filePath: parsedFile.filePath, fileName: parsedFile.fileName });
      } catch (err) {
        console.error(`Error processing file: ${parsedFile.fileName}`, err);
        invalid.push({ fileName: parsedFile.fileName, error: err.message });
      }
    }

    return { valid, invalid };
  } catch (err) {
    console.log(err);
    throw err instanceof MarroneError ? err : new MarroneError('Import Environment failed');
  }
};

export default importEnvironment;
