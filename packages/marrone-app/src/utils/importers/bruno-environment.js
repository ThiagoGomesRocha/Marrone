import { MarroneError } from 'utils/common/error';
import { buildEnvVariable, coerceEnvColor, coerceEnvName, dedupeImportedSecrets } from 'utils/environments';
import { validatedEnvironmentExtendsFrom } from '@marrone/common/utils';

const validateMarroneEnvironment = (env, filePath, fileName) => {
  if (!env || typeof env !== 'object') {
    throw new MarroneError('Invalid environment: expected an object');
  }

  const name = coerceEnvName(env.name);
  if (name === null) {
    throw new MarroneError('Invalid environment: missing or invalid name');
  }

  if (!Array.isArray(env.variables)) {
    throw new MarroneError('Invalid environment: missing or invalid variables array');
  }

  // Validate each variable
  env.variables.forEach((variable, index) => {
    if (!variable || typeof variable !== 'object') {
      throw new MarroneError(`Invalid variable at index ${index}: expected an object`);
    }
    if (!variable.name || typeof variable.name !== 'string') {
      throw new MarroneError(`Invalid variable at index ${index}: missing or invalid name`);
    }
  });

  const environmentExtendsFrom = validatedEnvironmentExtendsFrom(env.extends);
  const hasExtendsReference = env.extends !== undefined && env.extends !== null && env.extends !== '';
  if (hasExtendsReference && !environmentExtendsFrom) {
    throw new MarroneError('Invalid environment: extends is not a valid environment name');
  }

  const variables = env.variables.map((envVariable) => buildEnvVariable({ envVariable, withUuid: true }));

  return {
    name,
    variables: dedupeImportedSecrets(variables),
    color: coerceEnvColor(env.color),
    extends: environmentExtendsFrom,
    filePath,
    fileName
  };
};

const processEnvironmentData = (data, fileName, filePath) => {
  const valid = [];
  const invalid = [];

  try {
    // Handle new single-file format with environments array
    if (data.info && data.info.type === 'bruno-environment' && Array.isArray(data.environments)) {
      data.environments.forEach((env, index) => {
        try {
          valid.push(validateMarroneEnvironment(env, filePath, fileName));
        } catch (err) {
          invalid.push({ fileName, error: err.message });
        }
      });
      return { valid, invalid };
    }

    // Handle array of environments (old format)
    if (Array.isArray(data)) {
      data.forEach((env, index) => {
        try {
          valid.push(validateMarroneEnvironment(env, filePath, fileName));
        } catch (err) {
          invalid.push({ fileName, error: err.message });
        }
      });
      return { valid, invalid };
    }

    // Handle single environment object
    try {
      valid.push(validateMarroneEnvironment(data, filePath, fileName));
    } catch (err) {
      invalid.push({ fileName, error: err.message });
    }
    return { valid, invalid };
  } catch (err) {
    invalid.push({ fileName, error: `Error processing ${fileName}: ${err.message}` });
    return { valid, invalid };
  }
};

const processFiles = (parsedFiles) => {
  const allValid = [];
  const allInvalid = [];

  for (const parsedFile of parsedFiles) {
    try {
      const { valid, invalid } = processEnvironmentData(parsedFile.content, parsedFile.fileName, parsedFile.filePath);
      allValid.push(...valid);
      allInvalid.push(...invalid);
    } catch (err) {
      allInvalid.push({ fileName: parsedFile.fileName, error: `Failed to process ${parsedFile.fileName}: ${err.message}` });
    }
  }

  return { valid: allValid, invalid: allInvalid };
};

const importMarroneEnvironment = (parsedFiles) => {
  try {
    if (!parsedFiles || parsedFiles.length === 0) {
      throw new MarroneError('No files provided');
    }

    const result = processFiles(parsedFiles);
    return result;
  } catch (err) {
    console.error(err);
    throw err instanceof MarroneError ? err : new MarroneError('Import Marrone environment failed');
  }
};

export { importMarroneEnvironment, processEnvironmentData };
export default importMarroneEnvironment;
