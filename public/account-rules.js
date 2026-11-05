export function usernameValue(raw){
  if(typeof raw!=='string')throw new Error('请填写用户名。');
  const name=raw.trim().normalize('NFC'),bytes=new TextEncoder().encode(name).length;
  if(!name||bytes>30||/[\p{Cc}\p{Cf}]/u.test(name))throw new Error('用户名需为 1—30 字节，汉字通常占 3 字节。');
  return name;
}
export function passwordValue(raw){
  if(typeof raw!=='string'||[...raw].length<6||[...raw].length>128||new TextEncoder().encode(raw).length>512)throw new Error('密码至少 6 个字符，最多 128 个字符。');
  return raw;
}
