import {escapeHTML as esc} from './ui.js';
export const authorLinks=()=>'<p class="author-links">作者微信 / 手机：<a href="tel:15760362553">15760362553</a> <span>·</span> <a href="https://www.bilibili.com/video/BV16BxX67E3D/" target="_blank" rel="noopener">B 站入门教程 ↗</a></p>';
export function checkinView(c,btn){
  return '<span class="eyebrow">每天一份花园礼物</span><h2>七天签到</h2><p class="checkin-note">按北京时间每日领取一次。漏签一天从第 1 天重新开始；领满七天后开始新一轮。</p><div class="checkin-grid">'+c.rewards.map(r=>'<article class="checkin-day '+(r.day<=c.completed?'claimed':r.day===c.day?'today':'')+'"><small>第 '+r.day+' 天</small><span>'+r.icon+'</span><b>'+esc(r.label)+'</b><em>'+(r.day<=c.completed?'已领取':r.day===c.day?'今天的礼物':'连续签到解锁')+'</em></article>').join('')+'</div>'+btn('checkin-claim',c.claimed?'今天已经领过啦':'领取第 '+c.day+' 天 · '+esc(c.rewards[c.day-1].label),'primary wide',c.claimed?'disabled':'')+btn('close-modal','回花园','text-button wide');
}
export function rewriteEditorSource(s,entry){
  const head=s.mode==='all'?"repeat' rw":s.mode==='nth'?'nth_rewrite '+(s.occurrences[0]||1):'rw';
  return head+' ['+(s.direction==='backward'?'← ':'')+entry.term+']'+(s.target==='goal'?'':' at '+s.target);
}
