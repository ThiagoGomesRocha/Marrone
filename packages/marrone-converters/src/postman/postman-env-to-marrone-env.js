import each from 'lodash/each';
import { invalidVariableCharacterRegex } from '../constants';
import { uuid } from '../common';

const isSecret = (type) => {
  return type === 'secret';
};

const importPostmanEnvironmentVariables = (marroneEnvironment, values = []) => {
  marroneEnvironment.variables = marroneEnvironment.variables || [];

  each(values.filter((i) => !(i.key == null && i.value == null)), (i) => {
    const marroneEnvironmentVariable = {
      uid: uuid(),
      name: (i.key ?? '').replace(invalidVariableCharacterRegex, '_'),
      value: i.value ?? '',
      enabled: i.enabled ?? true,
      type: 'text',
      secret: isSecret(i.type)
    };

    marroneEnvironment.variables.push(marroneEnvironmentVariable);
  });
};

const importPostmanEnvironment = (environment) => {
  const marroneEnvironment = {
    name: environment.name,
    variables: []
  };

  importPostmanEnvironmentVariables(marroneEnvironment, environment.values);
  return marroneEnvironment;
};

export const postmanToMarroneEnvironment = (postmanEnvironment) => {
  try {
    return importPostmanEnvironment(postmanEnvironment);
  } catch (err) {
    console.log(err);
    throw new Error('Unable to parse the postman environment json file');
  }
};

export default postmanToMarroneEnvironment;
