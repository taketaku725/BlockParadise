// ===== ブロック☆パラダイス 完全版 =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let scene = "title";
let level = 1;
let score = 0;
let totalTimeLeft = 90;
let timerInterval;
let gameOver = false;

const paddle = {
  width: 80,
  height: 10,
  x: (canvas.width - 80) / 2,
  y: 600,
  maxWidth: 140,
  minWidth: 40,
};

let balls = [];
let bricks = [];
let items = [];
let timeTexts = [];

const brick = {
  rowCount: 3,
  columnCount: 5,
  width: 75,
  height: 20,
  padding: 10,
  offsetTop: 60,
  offsetLeft: 25,
};

const itemTypesBase = ["expand", "multi", "shrink", "time"];

// ===== ランキング処理 =====
function loadRanking() {
  const data = localStorage.getItem("blockParadiseRanking");
  return data ? JSON.parse(data) : [];
}
function saveRanking(list) {
  localStorage.setItem("blockParadiseRanking", JSON.stringify(list));
}

// ===== タイマー =====
function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (scene === "game" && !gameOver) {
      totalTimeLeft--;
      if (totalTimeLeft <= 0) handleGameOver();
    }
  }, 1000);
}

// ===== ブロック生成 =====
function createBricks() {
  bricks = [];
  for (let c = 0; c < brick.columnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brick.rowCount; r++) {
      const rand = Math.random();
      let type = "normal";
      let hp = 1;

      let ghostChance = 0;
      if (level >= 3 && level < 5) ghostChance = 0.1;
      else if (level >= 5 && level < 8) ghostChance = 0.17;
      else if (level >= 8 && level < 11) ghostChance = 0.25;
      else if (level >= 11) ghostChance = 0.33;

      if (level >= 3 && rand < ghostChance) type = "ghost";
      else if (level >= 8 && rand < ghostChance + 0.2) {
        type = "super"; hp = 3;
      } else if (level >= 5 && rand < ghostChance + 0.4) {
        type = "durable"; hp = 2;
      }

      bricks[c][r] = { x: 0, y: 0, hp, type, active: type !== "ghost", visible: true, timer: null };
    }
  }
}

// ===== 描画 =====
function drawBricks() {
  for (let c = 0; c < brick.columnCount; c++) {
    for (let r = 0; r < brick.rowCount; r++) {
      const b = bricks[c][r];
      if (!b.visible) continue;
      const bx = c * (brick.width + brick.padding) + brick.offsetLeft;
      const by = r * (brick.height + brick.padding) + brick.offsetTop;
      b.x = bx; b.y = by;

      if (b.type === "ghost" && !b.active) {
        ctx.strokeStyle = "rgba(180,180,180,0.5)";
        ctx.strokeRect(bx, by, brick.width, brick.height);
        continue;
      }

      if (b.type === "super") {
        if (b.hp === 3) ctx.fillStyle = "#dab3ff";
        else if (b.hp === 2) ctx.fillStyle = "#ffb3b3";
        else ctx.fillStyle = "#b3ffb3";
      } else if (b.hp === 2) ctx.fillStyle = "#ffd1a3";
      else ctx.fillStyle = "#b3ffb3";

      ctx.fillRect(bx, by, brick.width, brick.height);
    }
  }
}

function drawHUD() {
  ctx.fillStyle = "#444";
  ctx.font = "16px 'Comic Sans MS'";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 10, 25);
  ctx.textAlign = "center";
  ctx.fillText(`Time: ${totalTimeLeft}`, canvas.width / 2, 25);
  ctx.textAlign = "right";
  ctx.fillText(`Level: ${level}`, canvas.width - 10, 25);
}

// ===== タイム演出 =====
function addTimeText(text, x, y, color = "#ff66a3") {
  timeTexts.push({ text, x, y, alpha: 1, dy: -1, color });
}
function updateTimeTexts() {
  timeTexts = timeTexts.filter((t) => (t.alpha -= 0.02) > 0);
}
function drawTimeTexts() {
  timeTexts.forEach((t) => {
    ctx.globalAlpha = t.alpha;
    ctx.fillStyle = t.color;
    ctx.font = "bold 20px 'Comic Sans MS'";
    ctx.textAlign = "center";
    ctx.fillText(t.text, t.x, t.y);
    ctx.globalAlpha = 1;
  });
}

// ===== ゲームオーバー処理 =====
function handleGameOver() {
  clearInterval(timerInterval);

  const ranking = loadRanking();
  ranking.push({ score, level, date: new Date().toLocaleDateString() });
  ranking.sort((a, b) => b.score - a.score);
  ranking.splice(100); // ← 100位まで保存
  saveRanking(ranking);

  gameOver = true;
  scene = "ranking";
  drawRankingScreen(score, level);
}

// ===== ステージクリア =====
function nextLevel() {
  level++;
  brick.rowCount = Math.min(12, brick.rowCount + 1);
  createBricks();
  totalTimeLeft += 15;
  addTimeText("+15s", canvas.width / 2, 60, "#66cc66");
}

// ===== ゲームループ =====
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBricks();
  drawHUD();
  drawTimeTexts();
  updateTimeTexts();
  moveBalls();
  moveItems();
  if (!gameOver && scene === "game") requestAnimationFrame(gameLoop);
}

// ===== ランキング描画 =====
function drawRankingScreen(currentScore = null, currentLevel = null) {
  const ranking = loadRanking();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ff66a3";
  ctx.font = "bold 28px 'Comic Sans MS'";
  ctx.textAlign = "center";
  ctx.fillText("ローカルランキング（上位100位まで）", canvas.width / 2, 80);

  ctx.font = "18px 'Comic Sans MS'";
  ctx.textAlign = "center";

  if (ranking.length === 0) {
    ctx.fillStyle = "#444";
    ctx.fillText("まだ記録がありません", canvas.width / 2, 150);
    return;
  }

  let currentIndex = -1;
  if (currentScore !== null) {
    currentIndex = ranking.findIndex((r) => r.score === currentScore && r.level === currentLevel);
  }

  const maxDisplay = Math.min(10, ranking.length);
  for (let i = 0; i < maxDisplay; i++) {
    const r = ranking[i];
    const text = `${i + 1}. ${r.score}点 / Lv.${r.level} (${r.date})`;

    if (i === currentIndex) {
      ctx.fillStyle = "#ffe0f0";
      ctx.fillRect(canvas.width / 2 - 180, 125 + i * 30, 360, 25);
      ctx.fillStyle = "#ff3399";
    } else ctx.fillStyle = "#444";

    ctx.fillText(text, canvas.width / 2, 145 + i * 30);
  }

  if (currentIndex >= 10 && currentIndex < 100) {
    const rankPos = currentIndex + 1;
    const r = ranking[currentIndex];
    const text = `${rankPos}. ${r.score}点 / Lv.${r.level} (${r.date})`;
    ctx.fillStyle = "#ff3399";
    ctx.fillText(`あなたは ${rankPos} 位でした！`, canvas.width / 2, 140 + maxDisplay * 30 + 30);
    ctx.fillStyle = "#444";
    ctx.fillText(text, canvas.width / 2, 140 + maxDisplay * 30 + 60);
  } else if (currentIndex >= 100 || currentIndex === -1) {
    ctx.fillStyle = "#888";
    ctx.fillText("あなたはランキング圏外でした", canvas.width / 2, 140 + maxDisplay * 30 + 40);
  }

  ctx.fillStyle = "#ff66a3";
  ctx.font = "20px 'Comic Sans MS'";
  ctx.fillText("クリックでタイトルへ", canvas.width / 2, canvas.height - 60);
}

// ===== あそびかた画面 =====
function drawHelpScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ff66a3";
  ctx.font = "bold 26px 'Comic Sans MS'";
  ctx.textAlign = "center";
  ctx.fillText("あそびかた", canvas.width / 2, 60);

  ctx.fillStyle = "#444";
  ctx.font = "17px 'Comic Sans MS'";
  ctx.textAlign = "left";
  let y = 110;
  ctx.fillText("★ バーでボールをはね返してブロックをこわそう！", 40, y);
  y += 30;
  ctx.fillText("★ 制限時間は90秒。0になるとゲームオーバー！", 40, y);
  y += 30;
  ctx.fillText("★ ステージクリアで +15秒！", 40, y);
  y += 60;

  // 戻るボタン
  ctx.textAlign = "center";
  ctx.fillStyle = "#a3ccff";
  ctx.fillRect(canvas.width / 2 - 80, canvas.height - 100, 160, 40);
  ctx.fillStyle = "#fff";
  ctx.font = "18px 'Comic Sans MS'";
  ctx.fillText("タイトルへ戻る", canvas.width / 2, canvas.height - 72);
}

// ===== タイトル画面 =====
function drawTitleScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ff66a3";
  ctx.font = "bold 36px 'Comic Sans MS'";
  ctx.textAlign = "center";
  ctx.fillText("ブロック☆パラダイス", canvas.width / 2, canvas.height / 2 - 60);

  ctx.fillStyle = "#ff99cc";
  ctx.font = "20px 'Comic Sans MS'";
  ctx.fillText("クリックでゲーム説明へ", canvas.width / 2, canvas.height / 2 - 10);

  ctx.fillStyle = "#a3ccff";
  ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2, 200, 40);
  ctx.fillStyle = "#fff";
  ctx.font = "18px 'Comic Sans MS'";
  ctx.fillText("ランキングを見る", canvas.width / 2, canvas.height / 2 + 27);
}

// ===== シーン遷移 =====
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if (scene === "title") {
    if (mx > canvas.width / 2 - 100 && mx < canvas.width / 2 + 100 && my > canvas.height / 2 && my < canvas.height / 2 + 40)
      scene = "ranking", drawRankingScreen();
    else scene = "help", drawHelpScreen();
  } else if (scene === "help") {
    if (mx > canvas.width / 2 - 80 && mx < canvas.width / 2 + 80 && my > canvas.height - 100 && my < canvas.height - 60)
      scene = "title", drawTitleScreen();
    else scene = "game", resetGame(), requestAnimationFrame(gameLoop);
  } else if (scene === "ranking") {
    scene = "title"; drawTitleScreen();
  }
});

// ===== リセット =====
function resetGame() {
  level = 1;
  score = 0;
  gameOver = false;
  totalTimeLeft = 90;
  paddle.width = 80;
  brick.rowCount = 3;
  balls = [{ x: canvas.width / 2, y: 580, radius: 7, dx: 3, dy: -3, speed: 4, immune: false }];
  items = [];
  timeTexts = [];
  createBricks();
  startTimer();
}

// ===== 起動 =====
drawTitleScreen();
