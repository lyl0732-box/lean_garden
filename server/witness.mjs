import {safeName} from './rewrite.mjs';

// Only a small expression grammar crosses the HTTP boundary. Tactics, commands,
// declarations, quotations, holes and arbitrary constants are never accepted.
export function witnessExpression(text,goals,known=new Set(),constants=[]) {
  if(typeof text!=='string'||!text.trim()||text.length>180)throw new Error('请手动填写一个见证，最多 180 个字符。');
  const names=new Set((goals[0]?.hypotheses||[]).filter(h=>!h.isProp&&safeName(h.name)).map(h=>h.name));
  names.add('succ');
  for(const name of constants)names.add(name);
  if(known.has('bezout')){names.add('Int.gcdA');names.add('Int.gcdB');}
  if(known.has('abs'))names.add('abs');
  const tokens=[],pattern=/\s+|\d+|[\p{L}_][\p{L}\p{N}_'₀-₉]*(?:\.[\p{L}_][\p{L}\p{N}_'₀-₉]*)*|[()+\-*/%^]/uy;
  for(let offset=0;offset<text.length;){pattern.lastIndex=offset;const m=pattern.exec(text);if(!m)throw new Error('这里只填写数、当前变量和运算式；不填写 Lean 命令。');offset=pattern.lastIndex;if(m[0].trim())tokens.push(m[0]);}
  if(tokens.length>100)throw new Error('见证太长，请把构造写得简洁一些。');
  let index=0,depth=0;
  const atomStart=t=>t==='('||/^\d+$/.test(t||'')||names.has(t);
  function atom(){if(++depth>24)throw new Error('括号嵌套太深。');const t=tokens[index++];let out;
    if(t==='('){out=expression();if(tokens[index++]!==')')throw new Error('左右括号需要配对。');}
    else if(/^\d{1,12}$/.test(t||''))out=t;
    else if(names.has(t))out=t;
    else throw new Error(`「${t||'空白'}」不是可用的数或当前变量。`);
    depth--;return out;
  }
  function application(){let out=atom();while(atomStart(tokens[index]))out=`(${out} ${atom()})`;return out;}
  function power(){let out=application();if(tokens[index]==='^'){index++;out=`(${out} ^ ${unary()})`;}return out;}
  function unary(){if(tokens[index]==='-'||tokens[index]==='+'){const op=tokens[index++];return `(${op}${unary()})`;}return power();}
  function product(){let out=unary();while(['*','/','%'].includes(tokens[index])){const op=tokens[index++];out=`(${out} ${op} ${unary()})`;}return out;}
  function expression(){let out=product();while(['+','-'].includes(tokens[index])){const op=tokens[index++];out=`(${out} ${op} ${product()})`;}return out;}
  const result=expression();if(index!==tokens.length)throw new Error('这个构造还没写完整，请检查运算符和括号。');return result;
}
export function selectedWitness(goals,selection,known){
  const expression=witnessExpression(selection?.expression,goals,known);
  return {kind:'witness',expression:selection.expression.trim(),code:`use ${expression}`};
}
export function actionTarget(action,goals){
  const code=action?.code||'',names=new Set((goals[0]?.hypotheses||[]).map(h=>h.name));
  const at=/\bat\s+([^\s\n]+)/.exec(code)?.[1];if(names.has(at))return at;
  if(/^(rcases|cases|specialize)\s/.test(code)){
    const body=code.split(/\swith\s/)[0];
    for(const token of body.split(/[^\p{L}\p{N}_'₀-₉]+/u))if(names.has(token))return token;
  }
  return 'goal';
}
