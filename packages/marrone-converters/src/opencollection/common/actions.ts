import { uuid } from '../../common/index.js';
import type {
  Action,
  ActionSetVariable,
  ActionVariableScope,
  MarroneVariable,
  MarroneVariables
} from '../types';

/**
 * Convert Marrone post-response variables to OpenCollection actions.
 * Post-response variables in Marrone are converted to 'set-variable' actions
 * with phase 'after-response'.
 */
export const toOpenCollectionActions = (resVariables: MarroneVariables | null | undefined): Action[] | undefined => {
  if (!resVariables?.length) {
    return undefined;
  }

  const actions: Action[] = resVariables.map((v: MarroneVariable): ActionSetVariable => {
    const action: ActionSetVariable = {
      type: 'set-variable',
      phase: 'after-response',
      selector: {
        expression: v.value || '',
        method: 'jsonq'
      },
      variable: {
        name: v.name || '',
        scope: v.local ? 'request' : 'runtime' as ActionVariableScope
      }
    };

    if (v.description && typeof v.description === 'string' && v.description.trim().length) {
      action.description = v.description;
    }

    if (v.enabled === false) {
      action.disabled = true;
    }

    return action;
  });

  return actions.length > 0 ? actions : undefined;
};

/**
 * Convert OpenCollection actions to Marrone post-response variables.
 * Only 'set-variable' actions with phase 'after-response' are converted.
 */
export const fromOpenCollectionActions = (actions: Action[] | null | undefined): MarroneVariables => {
  if (!actions?.length) {
    return [];
  }

  const resVars: MarroneVariables = [];

  actions.forEach((action: Action) => {
    // Only process 'set-variable' actions with 'after-response' phase
    if (action.type === 'set-variable' && action.phase === 'after-response') {
      const setVarAction = action as ActionSetVariable;

      const variable: MarroneVariable = {
        uid: uuid(),
        name: setVarAction.variable?.name || '',
        value: setVarAction.selector?.expression || '',
        enabled: setVarAction.disabled !== true,
        local: setVarAction.variable?.scope === 'request'
      };

      if (setVarAction.description) {
        variable.description = typeof setVarAction.description === 'string'
          ? setVarAction.description
          : (setVarAction.description as { content?: string })?.content || '';
      }

      resVars.push(variable);
    }
  });

  return resVars;
};
