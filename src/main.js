import { Application, Assets, Container, Sprite, Graphics } from 'pixi.js';
import gsap from 'gsap';
import { Howl } from 'howler';

const REELS = 5;
const ROWS = 3;
const ICON_SIZE = 150;
const ICON_PADDING = 10;
const SPIN_SPEED = 15;
const sounds={
  stop: new Howl({ src: ['/assets/audio/reel-stop.mp3'] }),
  spin: new Howl({ src: ['/assets/audio/spin.mp3'], loop: true }),
  win: new Howl({ src: ['/assets/audio/win.mp3'] }),
  noWin: new Howl({ src: ['/assets/audio/no-win.mp3'] }),
  bigWin: new Howl({ src: ['/assets/audio/big-win.mp3'] }),
}
const iconsURLs = [
  '/assets/a.png',
  '/assets/b.png',
  '/assets/f.png',
  '/assets/g.png',
  '/assets/h.png',
  '/assets/j.png',
  '/assets/l.png',
  '/assets/n.png',
];

let app;
let loadedTextures = {};
let credit=50;
const reels = [];
let spinning = false;
let stopTimes = [];
let textureToId = new Map();

const resultText = document.getElementById('result');
const startBtn = document.getElementById('start-button');
const rechargeBtn = document.getElementById('recharge-button');
const overlayMessage = document.querySelector('.overlay-message');
const gameOverMsg = document.getElementById('game-over-message');

let reelWrapper;
let reelContainer; 

window.addEventListener('DOMContentLoaded', setup);

async function setup() {
  app = new Application();
  await app.init({
    resizeTo:window,
    backgroundColor: 0x87CEEB,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  document.getElementById('game-container').appendChild(app.canvas);
  Assets.addBundle('icons', iconsURLs.reduce((bundle, url) => {
    bundle[url] = url;
    return bundle;
  }, {}));

  loadedTextures = await Assets.loadBundle('icons');
  iconsURLs.forEach((url, index) => {
    const tex = loadedTextures[url];
    textureToId.set(tex, index);
  });

  createReels();
  startBtn.addEventListener('click', startSpin);
  app.ticker.add(update);
}

function createReels() {
  const spacing = ICON_SIZE + ICON_PADDING;
  const maskWidth = REELS * spacing - ICON_PADDING * ((REELS - 1) / REELS);
  const maskHeight = ROWS * spacing;
  reelWrapper = new Container();
  app.stage.addChild(reelWrapper);
  const reelWidth = REELS * spacing - ICON_PADDING;
  reelWrapper.x =(app.screen.width - reelWidth) / 2 ;
  reelWrapper.y = 150;

  reelContainer = new Container();
  reelWrapper.addChild(reelContainer);

  const mask = new Graphics()
    .rect(0, 0, maskWidth, maskHeight)
    .fill({ color: 0xffffff });
mask.y = ICON_PADDING / 2;
reelWrapper.addChild(mask);
reelWrapper.mask = mask;
  const frame = new Graphics()
    .rect(0, 0, maskWidth, maskHeight)
    .stroke({ color: 0x0000ff, width: 16 });
    frame.y = ICON_PADDING/2
  reelWrapper.addChild(frame);
  for (let i = 0; i < REELS; i++) {
    const reel = {
      container: new Container(),
      symbols: [],
      position: 0,
      stopping: false,
      stopped: false,
      spinSpeed: 0,
      
    };
    reel.container.x = i * spacing;
    reel.container.y = -ICON_SIZE; 
    reelContainer.addChild(reel.container)

    for (let j = 0; j < ROWS + 1; j++) {
      const symbol = new Sprite(getRandomTexture());
      symbol.width = symbol.height = ICON_SIZE;
      symbol.y = j * spacing;
      reel.container.addChild(symbol);
      reel.symbols.push(symbol);
    }
    reels.push(reel);  
  }
  scaleToFit();
  window.addEventListener('resize', scaleToFit);
}
function scaleToFit() {
  const spacing = ICON_SIZE + ICON_PADDING;
  const contentWidth = REELS * spacing - ICON_PADDING;
  const contentHeight = ROWS * spacing;

  const scaleX = app.screen.width / (contentWidth + 40);
  const scaleY = app.screen.height / (contentHeight + 200); 
  const scale = Math.min(scaleX, scaleY, 1); 

  reelWrapper.scale.set(scale);
  reelWrapper.x = (app.screen.width - contentWidth * scale) / 2;
  reelWrapper.y = app.screen.height *0.1;
}

function getRandomTexture() {
  const randomIndex = Math.floor(Math.random() * iconsURLs.length);
  const url = iconsURLs[randomIndex];
  return loadedTextures[url];
}
resultText.textContent = `КРЕДИТ:${credit}$`;

function startSpin() {
  startBtn.disabled = true;
  if (spinning) return;
  if (credit < 2) {
  resultText.textContent = `КРЕДИТ:${credit}`;
  overlayMessage.style.display = 'flex';
  overlayMessage.style.background = 'rgba(34, 34, 34, 0.8)';
  gameOverMsg.style.display = 'block';
  rechargeBtn.style.display = 'inline-block';
  startBtn.disabled = true;
    return;
  }
  spinning = true;
  startBtn.disabled = true;
  credit=credit-2
  resultText.textContent = `КРЕДИТ:${credit}$`;
  const now = performance.now();
  stopTimes = [];

  sounds.spin.stop();
  sounds.spin.play();
  reels.forEach((reel, i) => {
    reel.stopping = false;
    reel.stopped = false;
    reel.position = 0;
    reel.spinSpeed = 0;
  
    gsap.to(reel, {
      spinSpeed: SPIN_SPEED,
      duration: 0.6,
      ease: 'power1.out',
    });
    stopTimes[i] = now + 2000 + i * 400 + Math.random() * 400;
  }); 
  }
  
function update(delta) {
  if (!spinning) return;
  const now = performance.now();
  const spacing = ICON_SIZE + ICON_PADDING;
  const totalHeight = (ROWS + 1) * spacing;
  reels.forEach((reel, i) => {
    const moveBy = reel.spinSpeed * delta.speed;
    if (reel.stopped) return;
    if (!reel.stopping && now >= stopTimes[i]) {
      reel.stopping = true;
      animateStop(reel, i);
      return;
    }
    if (!reel.stopping) {  
      reel.position += moveBy;
      reel.symbols.forEach((symbol) => {
        symbol.y += moveBy;
        if (symbol.y >= totalHeight) {
          symbol.y -= totalHeight;
          symbol.texture = getRandomTexture();
          symbol.textureId = undefined; 
        }
      });
    }
  });
  const allStopped = reels.every(reel => reel.stopped);
  if (allStopped) {
    spinning = false;
    startBtn.disabled = false;
    sounds.spin.pause(); 
    checkWinLines(); 
    }
  }

function animateStop(reel) {
  const spacing = ICON_SIZE + ICON_PADDING;
  const totalHeight = (ROWS + 1) * spacing;
  reel.soundPlayed = false; 
  const timeline = gsap.timeline({
   onComplete: () => {
    reel.stopped = true;
  }
   });  
  reel.symbols.forEach((symbol) => {
    let currentY = symbol.y % totalHeight;
    if (currentY < 0) currentY += totalHeight;
    const targetY = Math.round(currentY / spacing) * spacing;
    timeline.to(symbol, {
      y: targetY,
      duration: 0.5,
      ease: 'power2.out',
      onStart: () => {
        if (!reel.soundPlayed) {
          reel.soundPlayed = true;
          sounds.stop.play();
        }
      }
    }, 0)      
  })
}

function checkWinLines() {
  const spacing = ICON_SIZE + ICON_PADDING;
  const rowPositions = [spacing, spacing * 2, spacing * 3];
  const lines = [[], [], []];
  
  rowPositions.forEach((targetY, rowIndex) => {
    reels.forEach(reel => {
      let closestSymbol = null;
      let minDelta = Infinity;
      for (const symbol of reel.symbols) {
        const delta = Math.abs(symbol.y - targetY);
        if (delta < minDelta) {
          minDelta = delta;
          closestSymbol = symbol;
        }
      }
      if (!closestSymbol) return;
      if (closestSymbol.textureId === undefined) {
        closestSymbol.textureId = textureToId.get(closestSymbol.texture);
      }
      lines[rowIndex].push(closestSymbol);
    });
  });

  let winResults = [];
  let hasBigWin = false;
  lines.forEach((line, lineIndex) => {
    if (line.length === 0) return;
    let count = 1;
    let currentId = line[0].textureId;
    let tempSymbols = [line[0]];
    for (let i = 1; i < line.length; i++) {
      if (line[i].textureId === currentId) {
        count++;
        tempSymbols.push(line[i]);
      } else {
        if (count >= 2) {
          winResults.push({ count, lineIndex, symbols: [...tempSymbols] });
          if (count === 5) hasBigWin = true;
        }
        currentId = line[i].textureId;
        count = 1;
        tempSymbols = [line[i]];
      }
    }
    if (count >= 2) {
      winResults.push({ count, lineIndex, symbols: [...tempSymbols] });
      if (count === 5) hasBigWin = true;
    }
  });
  if (winResults.length === 0) {
    sounds.noWin.play(); 
    resultText.textContent = `КРЕДИТ:${credit}$`;
    return;
  }
  
  winResults.forEach(win => {
    switch (win.count) {
      case 5:credit=credit+30 ;
      hasBigWin = true;
      break;
      case 4:credit=credit+10 ; break;
      case 3:credit=credit+5 ; break;
      case 2:credit=credit+1; break;
    }
    win.symbols.forEach(symbol => {
      gsap.to(symbol, { alpha: 0.1, duration: 0.2, yoyo: true, repeat: 3, 
      });
    });
  });
  if (hasBigWin) {
    sounds.bigWin.play();
    showConfetti()
  } else {
    sounds.win.play();
  }
  resultText.textContent = `КРЕДИТ:${credit}$`;
}

rechargeBtn.addEventListener('click', () => {
  credit = 50;
  resultText.textContent = `КРЕДИТ:${credit}$`;
  startBtn.disabled = false;
  overlayMessage.style.display = 'none';
  overlayMessage.style.background = 'none';
  gameOverMsg.style.display = 'none';
  rechargeBtn.style.display = 'none';
});

function showConfetti() {
  const confettiContainer = new Container();
  app.stage.addChild(confettiContainer);

  const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
  const tweens = [];
  for (let i = 0; i < 200; i++) {
    const width = 4 + Math.random() * 4;
    const height = 8 + Math.random() * 6;
    const confetti = new Graphics()
      .rect(0, 0,  width, height)
      .fill({ color: colors[Math.floor(Math.random() * colors.length)] });

    confetti.x = Math.random() * app.screen.width;
    confetti.y = -Math.random() * 200;
    confetti.rotation = Math.random() * Math.PI;

    confettiContainer.addChild(confetti);

    const fallTime = 4 + Math.random() * 4;
    const drift = (Math.random() - 0.5) * 100;
    const spin = Math.PI * 2 + Math.random() * Math.PI * 4;
    const delay = Math.random() * 1.5; 
    gsap.to(confetti, {
      y: app.screen.height + 50,
      x: `+=${drift}`,
      rotation: `+=${spin}`,
      duration: fallTime,
      delay,
      ease: 'sine.inOut',
    });
    const swayTween = gsap.to(confetti, {
      x: "+=20",
      duration: 1 + Math.random(),
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay
    });
    tweens.push(swayTween); 
  }
  setTimeout(() => {
    tweens.forEach(tween => tween.kill());
    confettiContainer.destroy({ children: true });
  }, 9500);
}








