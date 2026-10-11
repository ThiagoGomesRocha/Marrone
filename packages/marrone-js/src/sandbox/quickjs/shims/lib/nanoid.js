const { nanoid } = require('nanoid');
const { marshallToVm } = require('../../utils');

const addNanoidShimToContext = async (vm) => {
  let _nanoid = vm.newFunction('nanoid', function () {
    let v = nanoid();
    return marshallToVm(v, vm);
  });
  vm.setProp(vm.global, '__marrone__nanoid', _nanoid);
  _nanoid.dispose();

  vm.evalCode(
    `
      globalThis.nanoid = {};
      globalThis.nanoid.nanoid = globalThis.__marrone__nanoid;
      globalThis.requireObject = {
          ...globalThis.requireObject,
          'nanoid': globalThis.nanoid
      }
    `
  );
};

module.exports = addNanoidShimToContext;
