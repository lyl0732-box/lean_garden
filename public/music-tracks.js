// Local original recordings. Full attribution and file integrity: docs/MUSIC.md
// and assets/audio/manifest.json. Keep attribution when redistributing the game.
const track = (scene, id, title, isrc, filename) => Object.freeze({
  scene,
  id,
  title,
  artist: 'Kevin MacLeod',
  url: `https://incompetech.com/music/royalty-free/index.html?isrc=${isrc}`,
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  src: `/assets/audio/${filename}`
});

export const musicTracks = Object.freeze([
  track('home', 'carefree', 'Carefree', 'USUAN1400037', 'carefree-kevin-macleod.mp3'),
  track('map', 'enchanted-valley', 'Enchanted Valley', 'USUAN1200093', 'enchanted-valley-kevin-macleod.mp3'),
  track('garden', 'wholesome', 'Wholesome', 'USUAN1900022', 'wholesome-kevin-macleod.mp3'),
  track('n', 'life-of-riley', 'Life of Riley', 'USUAN1400054', 'life-of-riley-kevin-macleod.mp3'),
  track('l', 'adventures-in-adventureland', 'Adventures in Adventureland', 'USUAN2100029', 'adventures-in-adventureland-kevin-macleod.mp3'),
  track('a', 'dream-culture', 'Dream Culture', 'USUAN1300046', 'dream-culture-kevin-macleod.mp3'),
  track('t', 'cipher', 'Cipher', 'USUAN1100844', 'cipher-kevin-macleod.mp3')
]);

export const musicTracksByScene = Object.freeze(Object.fromEntries(
  musicTracks.map(track => [track.scene, track])
));
