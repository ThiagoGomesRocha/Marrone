// Cliente do renderer para os handlers `renderer:git-*` (ver ipc/git-ops.js).
// O nome do canal sai do nome do método: addRemote -> renderer:git-add-remote.

export const gitChannelFor = (method) => `renderer:git-${method.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`;

const call = (method, ...args) => window.ipcRenderer.invoke(gitChannelFor(method), ...args);

export const gitApi = {
  status: (collectionPath) => call('status', collectionPath),
  init: (collectionPath) => call('init', collectionPath),
  stage: (collectionPath, files) => call('stage', collectionPath, files),
  unstage: (collectionPath, files) => call('unstage', collectionPath, files),
  discard: (collectionPath, files) => call('discard', collectionPath, files),
  commit: (collectionPath, message) => call('commit', collectionPath, message),
  checkout: (collectionPath, branchName, shouldCreate = false) =>
    call('checkout', collectionPath, branchName, shouldCreate),
  addRemote: (collectionPath, name, url) => call('addRemote', collectionPath, name, url),
  removeRemote: (collectionPath, name) => call('removeRemote', collectionPath, name),
  fetch: (collectionPath, remote) => call('fetch', collectionPath, remote),
  push: (collectionPath, remote, branch) => call('push', collectionPath, remote, branch),
  pull: (collectionPath, remote, branch, strategy) => call('pull', collectionPath, remote, branch, strategy),
  stashCreate: (collectionPath, message) => call('stashCreate', collectionPath, message),
  stashApply: (collectionPath, index) => call('stashApply', collectionPath, index),
  stashDrop: (collectionPath, index) => call('stashDrop', collectionPath, index),
  resolveConflict: (collectionPath, file, side) => call('resolveConflict', collectionPath, file, side),
  completeMerge: (collectionPath, message) => call('completeMerge', collectionPath, message),
  abortMerge: (collectionPath) => call('abortMerge', collectionPath),
  publish: (collectionPath, remoteUrl, remote) => call('publish', collectionPath, remoteUrl, remote)
};
