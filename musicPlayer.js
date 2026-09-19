const { spawn } = require('child_process');

// Enable raw mode to read keypresses directly
process.stdin.setRawMode(true);
process.stdin.resume();

let isPaused = true;
let playerProcess = null;
let userChoice = 0;
let elapsedDuration = 0;
let totalDuration = 0;

const path = require('path');

const songMenu = [
  path.join(__dirname, 'songs/Spider-Man_-_The_Spectacular_Spiderman_Theme_(mp3.pm) 2.mp3'),
  path.join(__dirname, 'songs/Ultimate_spiderMan_THEME  2.mp3'),
  path.join(__dirname, 'songs/vidssave.com Ultimate SpiderMan theme 257 copy.mp3')
];




function getTotalDurationOfSong(songPath) {
  const afInfoProcess = spawn('afinfo', [songPath]);

  afInfoProcess.stdout.on('data', (data) => {
    const rawOutput = data.toString();
    if (rawOutput.includes('estimated duration: ')) {
      totalDuration = Number(rawOutput.split('estimated duration: ')[1].split('.')[0]);
    } else {
      totalDuration = 0;
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

  playerProcess = spawn('vlc', ['--intf', 'rc', songMenu[userChoice]], {
    stdio: ['pipe', 'ignore', 'ignore']
  });

  isPaused = false;
  listSongs();
}

function listSongs() {
  process.stdout.write('\x1b[2J\x1b[H'); // Clear screen & reset cursor
  console.log('--- CLI MUSIC PLAYER ---');
  
  songMenu.forEach((song, ind) => {
    const prefix = ind === userChoice ? '>' : ' ';
    console.log(`${prefix} ${ind} : ${song}`);
  })};

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
    playerProcess.stdin.write('pause\n'); // VLC uses 'pause' to toggle both states
    isPaused = !isPaused;
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