const addMarroneGrpcRequestShimToContext = require('./grpc/bruno-grpc-request');
const addMarroneGrpcResponseShimToContext = require('./grpc/bruno-grpc-response');

/**
 * Installs `bru.grpc` onto the `bru` object the bru shim has already put on the global, so it has
 * to run after it.
 */
const addMarroneGrpcShimToContext = (vm, grpc) => {
  const bruObject = vm.getProp(vm.global, 'bru');
  const grpcObject = vm.newObject();

  const { evalCode: requestEvalCode } = addMarroneGrpcRequestShimToContext(vm, grpc.request, grpcObject);
  // `response` is absent in `beforeCallStart`, which has no response yet.
  const { evalCode: responseEvalCode } = grpc.response
    ? addMarroneGrpcResponseShimToContext(vm, grpc.response, grpcObject)
    : { evalCode: [] };

  vm.setProp(bruObject, 'grpc', grpcObject);
  grpcObject.dispose();
  bruObject.dispose();

  // The list code reaches its target through `globalThis.bru.grpc`, so it can only run now that
  // `grpc` is on `bru`. Each block is braced on its own — every bridge declares the same consts.
  for (const code of [...requestEvalCode, ...responseEvalCode].filter(Boolean)) {
    vm.evalCode(`{ ${code} }`);
  }
};

module.exports = addMarroneGrpcShimToContext;
