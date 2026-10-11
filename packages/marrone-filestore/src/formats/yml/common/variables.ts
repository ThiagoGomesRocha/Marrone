import { Variable, VariableTypedValue } from '@opencollection/types/common/variables';
import { FolderRequest as MarroneFolderRequest } from '@marrone/schema-types/collection/folder';
import { Variable as MarroneVariable, Variables as MarroneVariables } from '@marrone/schema-types/common/variables';
import { uuid, ensureString } from '../../../utils';
import {
  isTypedValue,
  hasTypedMetadata,
  toOpenCollectionTypedValue,
  fromOpenCollectionTypedValue,
  serializeVariableValue
} from './datatype';

/**
 * Convert Marrone pre-request variables to OpenCollection variables format.
 * Note: Post-response variables are now converted to actions (see actions.ts).
 */
export const toOpenCollectionVariables = (variables: MarroneFolderRequest['vars'] | MarroneVariables | null | undefined): Variable[] | undefined => {
  // Handle folder variables (has req/res structure) - only use req vars
  const hasReqRes = variables && 'req' in variables;
  const reqVars = hasReqRes ? variables.req : variables as MarroneVariables;

  const reqVarsArray = Array.isArray(reqVars) ? reqVars : [];

  if (!reqVarsArray.length) {
    return undefined;
  }

  const ocVariables: Variable[] = reqVarsArray.map((v: MarroneVariable): Variable => {
    const valueStr = serializeVariableValue(v.value);
    const variable: Variable = {
      name: v.name || '',
      value: hasTypedMetadata(v) ? toOpenCollectionTypedValue(v, valueStr) : valueStr
    };

    if (v?.description?.trim().length) {
      variable.description = v.description;
    }

    if (v.enabled === false) {
      variable.disabled = true;
    }
    return variable;
  });

  return ocVariables.length > 0 ? ocVariables : undefined;
};

/**
 * Convert OpenCollection variables to Marrone pre-request variables format.
 * Note: Post-response variables come from actions (see actions.ts).
 */
export const toMarroneVariables = (variables: Variable[] | null | undefined): { req: MarroneVariables; res: MarroneVariables } => {
  if (!variables?.length) {
    return { req: [], res: [] };
  }

  const reqVars: MarroneVariables = [];

  variables.forEach((v: Variable) => {
    const base: MarroneVariable = {
      uid: uuid(),
      name: ensureString(v.name),
      value: '',
      enabled: v.disabled !== true,
      local: false
    };

    if (isTypedValue(v.value)) {
      Object.assign(base, fromOpenCollectionTypedValue(v.value));
    } else {
      base.value = ensureString(v.value);
    }

    if (v.description) {
      base.description = typeof v.description === 'string' ? v.description : (v.description as any)?.content || '';
    }

    reqVars.push(base);
  });

  return { req: reqVars, res: [] };
};
