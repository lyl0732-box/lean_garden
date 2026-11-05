const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('gardenWindow',Object.freeze({
  isFullscreen:()=>ipcRenderer.invoke('window:fullscreen-state'),
  toggle:()=>ipcRenderer.invoke('window:fullscreen-toggle'),
  onChange:callback=>{const listener=(_event,value)=>callback(!!value);ipcRenderer.on('window:fullscreen-changed',listener);return()=>ipcRenderer.removeListener('window:fullscreen-changed',listener);}
}));
if(location.protocol==='file:')contextBridge.exposeInMainWorld('gardenConnection',Object.freeze({read:()=>ipcRenderer.invoke('connection:read'),forget:()=>ipcRenderer.invoke('connection:forget'),exit:()=>ipcRenderer.invoke('connection:exit'),check:settings=>ipcRenderer.invoke('connection:check',settings),auth:settings=>ipcRenderer.invoke('connection:auth',settings),open:settings=>ipcRenderer.invoke('connection:open',settings),onUpdate:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('connection:update',listener);return()=>ipcRenderer.removeListener('connection:update',listener);}}));
