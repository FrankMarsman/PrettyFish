importScripts('vendor/fishdraw.js');
self.onmessage = ({ data }) => {
  try { self.postMessage({ id: data.id, scene: FishDraw.createScene(data.seed) }); }
  catch (error) { self.postMessage({ id: data.id, error: error.message || String(error) }); }
};
