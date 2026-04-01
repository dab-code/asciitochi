// Mini-games — number guess, catch, rock-paper-scissors

function showGameResult(bodyEl, msg, reward, resolve) {
  bodyEl.innerHTML = `
    <p style="text-align:center;margin:20px 0;">${msg}</p>
    <div style="text-align:center;">
      <button class="mg-done">OK</button>
    </div>
  `;
  bodyEl.querySelector('.mg-done').addEventListener('click', () => resolve(reward));
}

export function openMiniGameMenu(modalEl, titleEl, bodyEl, closeBtn) {
  return new Promise((resolve) => {
    titleEl.textContent = 'MINI-GAMES';
    bodyEl.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px;align-items:center;">
        <button class="mg-pick" data-game="guess">Number Guess</button>
        <button class="mg-pick" data-game="rps">Rock Paper Scissors</button>
        <button class="mg-pick" data-game="catch">Catch!</button>
      </div>
    `;
    modalEl.classList.remove('hidden');

    const cleanup = () => {
      modalEl.classList.add('hidden');
      closeBtn.removeEventListener('click', onClose);
    };

    const onClose = () => { cleanup(); resolve({ happiness: 0, energy: 0 }); };
    closeBtn.addEventListener('click', onClose);

    bodyEl.querySelectorAll('.mg-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        const game = btn.dataset.game;
        closeBtn.removeEventListener('click', onClose);
        let gamePromise;
        let cancelGame = null;
        if (game === 'guess') gamePromise = playGuess(titleEl, bodyEl);
        else if (game === 'rps') gamePromise = playRPS(titleEl, bodyEl);
        else {
          const result = playCatch(titleEl, bodyEl);
          gamePromise = result.promise;
          cancelGame = result.cancel;
        }

        const onCloseInGame = () => {
          if (cancelGame) cancelGame();
          cleanup();
          resolve({ happiness: 0, energy: 0 });
        };
        closeBtn.addEventListener('click', onCloseInGame);

        gamePromise.then(reward => {
          closeBtn.removeEventListener('click', onCloseInGame);
          cleanup();
          resolve(reward);
        });
      });
    });
  });
}

// ============================================================
// NUMBER GUESS
// ============================================================
function playGuess(titleEl, bodyEl) {
  return new Promise((resolve) => {
    const target = Math.floor(Math.random() * 10) + 1;
    let attempts = 3;

    titleEl.textContent = 'NUMBER GUESS';

    function render(msg) {
      bodyEl.innerHTML = `
        <p>${msg || `Guess a number 1-10! (${attempts} tries left)`}</p>
        <div class="minigame-choices">
          ${[1,2,3,4,5,6,7,8,9,10].map(n =>
            `<button class="guess-btn" data-n="${n}">${n}</button>`
          ).join('')}
        </div>
      `;
      bodyEl.querySelectorAll('.guess-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const n = parseInt(btn.dataset.n);
          attempts--;
          if (n === target) {
            showGameResult(bodyEl, `\u{1F389} Correct! It was ${target}!`, { happiness: 15, energy: 0 }, resolve);
          } else if (attempts <= 0) {
            showGameResult(bodyEl, `\u{274C} Out of tries! It was ${target}.`, { happiness: 2, energy: 0 }, resolve);
          } else {
            const hint = n < target ? 'Higher!' : 'Lower!';
            render(`${hint} (${attempts} tries left)`);
          }
        });
      });
    }

    render();
  });
}

// ============================================================
// ROCK PAPER SCISSORS
// ============================================================
function playRPS(titleEl, bodyEl) {
  return new Promise((resolve) => {
    const choices = ['rock', 'paper', 'scissors'];
    const icons = { rock: '\u{270A}', paper: '\u{1F590}', scissors: '\u{270C}\u{FE0F}' };
    let wins = 0, losses = 0, round = 0;
    const totalRounds = 3;

    titleEl.textContent = 'ROCK PAPER SCISSORS';

    function render(msg) {
      bodyEl.innerHTML = `
        <p style="text-align:center;">${msg || `Round ${round + 1} of ${totalRounds}`}</p>
        <p style="text-align:center;font-size:11px;margin:4px 0;">W:${wins} L:${losses}</p>
        <div class="minigame-choices">
          ${choices.map(c =>
            `<button class="rps-btn" data-c="${c}">${icons[c]}</button>`
          ).join('')}
        </div>
      `;
      bodyEl.querySelectorAll('.rps-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const player = btn.dataset.c;
          const cpu = choices[Math.floor(Math.random() * 3)];
          round++;

          let result;
          if (player === cpu) result = 'draw';
          else if (
            (player === 'rock' && cpu === 'scissors') ||
            (player === 'paper' && cpu === 'rock') ||
            (player === 'scissors' && cpu === 'paper')
          ) { result = 'win'; wins++; }
          else { result = 'lose'; losses++; }

          const resultText = `${icons[player]} vs ${icons[cpu]} — ${result.toUpperCase()}!`;

          if (round >= totalRounds) {
            const finalMsg = wins > losses
              ? `\u{1F389} You won ${wins}-${losses}!`
              : wins < losses
              ? `\u{1F622} You lost ${losses}-${wins}...`
              : `\u{1F91D} It's a tie!`;
            const reward = wins > losses
              ? { happiness: 15, energy: -5 }
              : wins === losses
              ? { happiness: 8, energy: -3 }
              : { happiness: 5, energy: -5 };
            showGameResult(bodyEl, `${resultText}<br><br>${finalMsg}`, reward, resolve);
          } else {
            render(`${resultText}`);
          }
        });
      });
    }

    render();
  });
}

// ============================================================
// CATCH GAME
// ============================================================
function playCatch(titleEl, bodyEl) {
  let cancelFn = null;
  const promise = new Promise((resolve) => {
    titleEl.textContent = 'CATCH!';

    const GAME_TIME = 15;
    const AREA_W = 260;
    const AREA_H = 200;
    const ITEMS = ['\u{2B50}', '\u{1F34E}', '\u{1F36C}', '\u{1F48E}', '\u{2764}\u{FE0F}'];
    let score = 0;
    let paddleX = AREA_W / 2 - 10;
    let items = [];
    let animFrame;
    let gameOver = false;
    let lastSpawn = 0;

    cancelFn = () => {
      gameOver = true;
      cancelAnimationFrame(animFrame);
      resolve({ happiness: 0, energy: 0 });
    };

    bodyEl.innerHTML = `
      <p style="text-align:center;">Catch items! Tap/click to move. Score: <span id="catch-score">0</span></p>
      <div class="catch-area" id="catch-area" style="width:${AREA_W}px;height:${AREA_H}px;margin:8px auto;touch-action:none;">
        <div class="catch-paddle" id="catch-paddle" style="left:${paddleX}px;">\u{1F3D3}</div>
      </div>
      <p style="text-align:center;font-size:11px;" id="catch-timer">Time: ${GAME_TIME}s</p>
    `;

    const area = bodyEl.querySelector('#catch-area');
    const paddle = bodyEl.querySelector('#catch-paddle');
    const scoreEl = bodyEl.querySelector('#catch-score');
    const timerEl = bodyEl.querySelector('#catch-timer');
    const startTime = Date.now();

    function movePaddle(clientX) {
      const rect = area.getBoundingClientRect();
      paddleX = Math.max(0, Math.min(AREA_W - 24, clientX - rect.left - 12));
      paddle.style.left = paddleX + 'px';
    }

    area.addEventListener('pointerdown', (e) => {
      movePaddle(e.clientX);
      e.preventDefault();
    });
    area.addEventListener('pointermove', (e) => {
      if (e.buttons > 0) movePaddle(e.clientX);
    });

    function spawnItem() {
      const item = document.createElement('div');
      item.className = 'catch-item';
      item.textContent = ITEMS[Math.floor(Math.random() * ITEMS.length)];
      item.style.left = Math.floor(Math.random() * (AREA_W - 24)) + 'px';
      item.style.top = '-20px';
      item._y = -20;
      item._speed = 1.5 + Math.random() * 2;
      area.appendChild(item);
      items.push(item);
    }

    function tick() {
      if (gameOver) return;

      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, GAME_TIME - elapsed);
      timerEl.textContent = `Time: ${Math.ceil(remaining)}s`;

      if (remaining <= 0) {
        endGame();
        return;
      }

      if (Date.now() - lastSpawn > 600) {
        spawnItem();
        lastSpawn = Date.now();
      }

      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item._y += item._speed;
        item.style.top = item._y + 'px';

        const ix = parseFloat(item.style.left);
        if (item._y >= AREA_H - 30 && item._y < AREA_H &&
            Math.abs(ix - paddleX) < 28) {
          score++;
          scoreEl.textContent = score;
          item.remove();
          items.splice(i, 1);
          continue;
        }

        if (item._y > AREA_H + 20) {
          item.remove();
          items.splice(i, 1);
        }
      }

      animFrame = requestAnimationFrame(tick);
    }

    function endGame() {
      gameOver = true;
      cancelAnimationFrame(animFrame);
      const reward = {
        happiness: Math.min(20, Math.floor(score * 2)),
        energy: -5,
      };
      const msg = `\u{1F3AE} Game Over!<br>Score: ${score}<br>${score >= 8 ? '\u{1F389} Great job!' : score >= 4 ? 'Not bad!' : 'Keep trying!'}`;
      showGameResult(bodyEl, msg, reward, resolve);
    }

    animFrame = requestAnimationFrame(tick);
  });
  return { promise, cancel: cancelFn };
}
