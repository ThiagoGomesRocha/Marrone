import type { Environment as MarroneEnvironment, EnvironmentVariable as MarroneEnvironmentVariable } from '@marrone/schema-types/collection/environment';
import type { Environment } from '@opencollection/types/config/environments';
import type { Variable, SecretVariable } from '@opencollection/types/common/variables';
import { parseYml } from './utils';
import { uuid, ensureString } from '../../utils';
import { isTypedValue, fromOpenCollectionTypedValue } from './common/datatype';
import { validatedEnvironmentExtendsFrom } from '@marrone/common/utils';

const isSecretVariable = (v: Variable | SecretVariable): v is SecretVariable => {
  return 'secret' in v && v.secret === true;
};

export const toMarroneEnvironmentVariables = (variables: (Variable | SecretVariable)[] | null | undefined): MarroneEnvironmentVariable[] => {
  if (!variables?.length) {
    return [];
  }

  return variables.map((v): MarroneEnvironmentVariable => {
    if (isSecretVariable(v)) {
      const variable: MarroneEnvironmentVariable = {
        uid: uuid(),
        name: ensureString(v.name),
        value: '',
        type: 'text',
        enabled: v.disabled !== true,
        secret: true
      };

      if (v.type && v.type !== 'string' && v.type !== 'null') {
        variable.dataType = v.type;
      }

      if (v.description) {
        variable.description = typeof v.description === 'string' ? v.description : (v.description as any)?.content || '';
      }

      return variable;
    }

    const variable: MarroneEnvironmentVariable = {
      uid: uuid(),
      name: ensureString(v.name),
      value: '',
      type: 'text',
      enabled: v.disabled !== true,
      secret: false
    };

    if (isTypedValue(v.value)) {
      Object.assign(variable, fromOpenCollectionTypedValue(v.value));
    } else {
      variable.value = ensureString(v.value);
    }

    if (v.description) {
      variable.description = typeof v.description === 'string' ? v.description : (v.description as any)?.content || '';
    }

    return variable;
  });
};

const toMarroneExternalSecrets = (externalSecrets: any): MarroneEnvironment['externalSecrets'] | undefined => {
  if (!externalSecrets || typeof externalSecrets !== 'object') {
    return undefined;
  }

  const variables = Array.isArray(externalSecrets.variables)
    ? externalSecrets.variables.map((variable: any) => {
        const result: Record<string, string> = { name: ensureString(variable?.name) };
        Object.keys(variable || {}).forEach((key) => {
          if (key !== 'name') {
            result[key] = ensureString(variable[key]);
          }
        });
        return result;
      })
    : [];

  return { type: ensureString(externalSecrets.type), variables } as MarroneEnvironment['externalSecrets'];
};

const parseEnvironment = (ymlString: string): MarroneEnvironment => {
  try {
    const ocEnvironment: Environment = parseYml(ymlString);

    const marroneEnvironment: MarroneEnvironment = {
      uid: uuid(),
      name: ensureString(ocEnvironment.name, 'Untitled Environment'),
      variables: toMarroneEnvironmentVariables(ocEnvironment.variables),
      color: ocEnvironment.color || null
    };

    const ocEnvironmentExtendsFrom = validatedEnvironmentExtendsFrom(ocEnvironment.extends);
    if (ocEnvironmentExtendsFrom) {
      marroneEnvironment.extends = ocEnvironmentExtendsFrom;
    }

    const externalSecrets = toMarroneExternalSecrets((ocEnvironment as any).externalSecrets);
    if (externalSecrets) {
      marroneEnvironment.externalSecrets = externalSecrets;
    }

    return marroneEnvironment;
  } catch (error) {
    console.error('Error parsing environment:', error);
    throw error;
  }
};

export default parseEnvironment;
