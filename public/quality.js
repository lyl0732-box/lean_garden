export const qualityKey='garden-asset-quality';
export const qualityChoices=[['high','清晰画面（最高）'],['low','流畅省流']];
export const normalizeQuality=value=>value==='low'?'low':'high';
export function readQuality(){try{return normalizeQuality(localStorage.getItem(qualityKey));}catch{return 'high';}}
export function saveQuality(value){const quality=normalizeQuality(value);try{localStorage.setItem(qualityKey,quality);}catch{}return quality;}
export function connectionQuality(){
  const url=new URL(location.href),requested=url.searchParams.get('garden-quality');
  if(['auto','high','low'].includes(requested)){const quality=saveQuality(requested);url.searchParams.delete('garden-quality');history.replaceState(history.state,'',url.href);return quality;}
  return readQuality();
}
