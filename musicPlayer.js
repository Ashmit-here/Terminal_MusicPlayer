const { spawn } = require('child_process');
const path = require('path');

if (!process.stdin.isTTY) {
  console.error("Error: Please run this script directly in a terminal using: node musicPlayer.js");
  process.exit(1);
}

process.stdin.setRawMode(true);
process.stdin.resume();

let isPaused = true;
let playerProcess = null;
let userChoice = 0;
let elapsedDuration = 0;
let totalDuration = 0;

const songMenu = [
  path.join(__dirname, 'songs/Spider-Man_-_The_Spectacular_Spiderman_Theme_(mp3.pm) 2.mp3'),
  path.join(__dirname, 'songs/Ultimate_spiderMan_THEME  2.mp3'),
  path.join(__dirname, 'songs/vidssave.com Ultimate SpiderMan theme 257 copy.mp3')
];

function drawProgressBar(current, total, width = 30) {
  if (!total || total === 0) return '[' + '░'.repeat(width) + '] 0%';
  const percentage = Math.min(Math.max(current / total, 0), 1);
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

  // Spawning VLC with rc interface using pipe stdio settings
  playerProcess = spawn('vlc', ['-I', 'rc', '--no-video', songMenu[userChoice]], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  isPaused = false;
  listSongs();
}

function listSongs() {
  process.stdout.write('\x1b[2J\x1b[H');
  console.log('--- CLI MUSIC PLAYER ---');

  songMenu.forEach((song, ind) => {
    const prefix = ind === userChoice ? '>' : ' ';
    console.log(`${prefix} ${ind} : ${path.basename(song)}`);
  });

  const progressBar = drawProgressBar(elapsedDuration, totalDuration);
  console.log(`\nProgress: ${progressBar}`);
  console.log(`Elapsed / Total: ${Math.round(elapsedDuration)}s / ${totalDuration}s`);
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

  // Toggle Pause/Play: p
  if (data[0] === 0x70 && playerProcess) {
    playerProcess.stdin.write('pause\n');
    isPaused = !isPaused;
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
