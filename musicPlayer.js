const { spawn } = require('child_process');
const path = require('path');

if (!process.stdin.isTTY) {
  console.error("Error: Please run this script directly in a terminal using: node musicPlayer.js");
  process.exit(1);
}

process.stdin.setRawMode(true);
process.stdin.resume();

let isPaused = true;
let isMuted = false;
let playerProcess = null;
let userChoice = 0;
let elapsedDuration = 0;
let totalDuration = 0;

let currentVolume = 256;
let previousVolume = 256;

const songMenu = [
  path.join(__dirname, 'songs/Spider-Man_-_The_Spectacular_Spiderman_Theme_(mp3.pm) 2.mp3'),
  path.join(__dirname, 'songs/Ultimate_spiderMan_THEME  2.mp3'),
  path.join(__dirname, 'songs/vidssave.com Ultimate SpiderMan theme 257 copy.mp3')
];

function drawBar(current, max, width = 30) {
  if (!max || max === 0) return '[' + '░'.repeat(width) + '] 0%';
  const percentage = Math.min(Math.max(current / max, 0), 1);
  const filledLength = Math.round(width * percentage);
  const emptyLength = width - filledLength;
  const bar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
  return `[${bar}] ${Math.round(percentage * 100)}%`;
}

function getTotalDurationOfSong(songPath) {
  const afInfoProcess = spawn('afinfo', [songPath]);

  afInfoProcess.stdout.on('data', (data) => {
    const rawOutput = data.toString();
    if (rawOutput.includes('estimated duration:')) {
      const match = rawOutput.match(/estimated duration:\s+([\d.]+)/);
      if (match) {
        totalDuration = Math.round(parseFloat(match[1]));
      }
    }
  });

  afInfoProcess.stderr.on('data', () => {
    totalDuration = 0;
  });
}

function playSong(index) {
  if (playerProcess) {
    playerProcess.kill('SIGKILL');
  }

  userChoice = (index + songMenu.length) % songMenu.length;
  elapsedDuration = 0;
  totalDuration = 0;

  getTotalDurationOfSong(songMenu[userChoice]);

  playerProcess = spawn('vlc', ['-I', 'rc', '--no-video', songMenu[userChoice]], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  isPaused = false;
  isMuted = false;
  currentVolume = 256;
  listSongs();
}

function listSongs() {
  process.stdout.write('\x1b[2J\x1b[H');
  console.log('--- CLI MUSIC PLAYER ---');

  songMenu.forEach((song, ind) => {
    const prefix = ind === userChoice ? '>' : ' ';
    console.log(`${prefix} ${ind} : ${path.basename(song)}`);
  });

  const songProgressBar = drawBar(elapsedDuration, totalDuration, 30);
  const volumeProgressBar = drawBar(isMuted ? 0 : currentVolume, 256, 15);

  console.log(`\nProgress : ${songProgressBar} (${Math.round(elapsedDuration)}s / ${totalDuration}s)`);
  console.log(`Volume   : ${volumeProgressBar} ${isMuted ? '[MUTED]' : ''}`);
  console.log(`Status   : ${isPaused ? 'PAUSED' : 'PLAYING'}`);
  console.log('\n[Up/Down]: Navigate | [Enter]: Play | [P]: Pause/Resume | [N]: Next | [B]: Prev');
  console.log('[+ / =]: Vol Up | [-]: Vol Down | [M]: Mute | [S]: Shuffle/Random | [Ctrl+C]: Exit');

}

process.stdin.on('data', (data) => {
  // Exit: Ctrl+C
  if (data[0] === 0x03) {
    if (playerProcess) playerProcess.kill('SIGKILL');
    process.exit(0);
  }

  // Next: n
  if (data[0] === 0x6e) playSong(userChoice + 1);

  // Prev: b
  if (data[0] === 0x62) playSong(userChoice - 1);

  // Shuffle / Random Song: s (0x73)
  if (data[0] === 0x73) {
    const randomIndex = Math.floor(Math.random() * songMenu.length);
    playSong(randomIndex);
  }

  // Toggle Pause/Play: p
  if (data[0] === 0x70 && playerProcess) {
    playerProcess.stdin.write('pause\n');
    isPaused = !isPaused;
    listSongs();
  }

  // Volume Up: + or =
  if ((data[0] === 0x2b || data[0] === 0x3d) && playerProcess) {
    if (isMuted) isMuted = false;
    currentVolume = Math.min(currentVolume + 16, 256);
    playerProcess.stdin.write(`volume ${currentVolume}\n`);
    listSongs();
  }

  // Volume Down: -
  if (data[0] === 0x2d && playerProcess) {
    if (isMuted) isMuted = false;
    currentVolume = Math.max(currentVolume - 16, 0);
    playerProcess.stdin.write(`volume ${currentVolume}\n`);
    listSongs();
  }

  // Toggle Mute: m
  if (data[0] === 0x6d && playerProcess) {
    if (!isMuted) {
      previousVolume = currentVolume;
      currentVolume = 0;
      playerProcess.stdin.write('volume 0\n');
      isMuted = true;
    } else {
      currentVolume = previousVolume > 0 ? previousVolume : 256;
      playerProcess.stdin.write(`volume ${currentVolume}\n`);
      isMuted = false;
    }
    listSongs();
  }

  // Play Selected: Enter
  if (data[0] === 0x0d) playSong(userChoice);

  // Navigation: Arrow Keys
  if (data[0] === 0x1b && data[1] === 0x5b) {
    if (data[2] === 0x41) { // Up
      userChoice = (userChoice - 1 + songMenu.length) % songMenu.length;
      listSongs();
    } else if (data[2] === 0x42) { // Down
      userChoice = (userChoice + 1) % songMenu.length;
      listSongs();
    }
  }
});

setInterval(() => {
  if (!isPaused && playerProcess) {
    elapsedDuration += 0.2;
    if (totalDuration > 0 && elapsedDuration > totalDuration) {
      elapsedDuration = totalDuration;
    }
    listSongs();
  }
}, 200);

listSongs();
