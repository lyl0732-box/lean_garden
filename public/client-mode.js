export const isAndroidClient=()=>/Android/i.test(navigator.userAgent)&&/LeanGarden\//.test(navigator.userAgent);
export function markClient(){document.documentElement.classList.toggle('android-client',isAndroidClient());}
