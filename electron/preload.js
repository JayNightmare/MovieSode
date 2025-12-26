// Expose limited APIs to the renderer for file picking.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("moviesode", {
  pickVideoFile: async () => {
    return ipcRenderer.invoke("select-video-file");
  },
});
