const pages=new Set(['home','adventure','mini','garden','shop']);
const chapters=new Set(['n','l','a','t']);
export function parseRoute(hash){
  const [page,value]=hash.replace(/^#/,'').split('/');
  if(page==='battle'&&/^[a-z][a-z0-9]*$/.test(value||''))return {page,level:value};
  if(pages.has(page))return {page,chapter:page==='adventure'&&chapters.has(value)?value:undefined};
  return {page:'home'};
}
export function routeFor(page,chapter,level){return page==='battle'?`#battle/${level}`:page==='adventure'?`#adventure/${chapter}`:`#${page}`;}
