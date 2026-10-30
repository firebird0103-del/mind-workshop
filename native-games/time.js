// Migrated from Fix4. Scoring, questions and timings are preserved.
export const template = "<div class=\"game-root \" data-game-id=\"clock\" data-phase=\"ready\"><main class=\"game-card\">\n    <div class=\"game-layout\">\n      <section class=\"info-area\">\n        <div class=\"eyebrow\">CHALLENGE 01</div>\n        <div class=\"title-row\"><h1>空間認知</h1><span class=\"game-tag\">掌握指針與空間位置</span></div>\n        <div class=\"game-hud\">\n          <div class=\"game-hud-row\">\n            <div class=\"status-row\">\n              <div class=\"status-pill\" id=\"status-bar\">進度 <strong>1 / 5</strong></div>\n              <div class=\"status-pill score-pill\" id=\"score-pill-wrap\">本關分數 <strong id=\"score-pill\">0</strong></div>\n            </div>\n          </div>\n          <div class=\"game-progress\" aria-label=\"遊戲進度\">\n            <span id=\"game-progress-bar\" role=\"progressbar\" aria-valuemin=\"0\" aria-valuemax=\"5\" aria-valuenow=\"0\"></span>\n          </div>\n        </div>\n        <div class=\"instruction\" id=\"instruction\">準備好挑戰你的時間感了嗎？<br>按下開始，看看你能不能精準撥出指定時間。</div>\n        <div class=\"tips\"><strong>小提示：</strong>拖曳時針或分針即可調整時間。先抓準，再確認。</div>\n      </section>\n\n      <section class=\"play-area\">\n        <div class=\"clock-stage\">\n          <div class=\"clock-container\" id=\"clock\">\n            <div class=\"hand hour-hand\" id=\"hour-hand\"><div class=\"hour-guide\"></div></div>\n            <div class=\"hand minute-hand\" id=\"minute-hand\"><div class=\"minute-guide\"></div></div>\n            \n          </div>\n        </div>\n        <div class=\"bc-game-hint\">直接拖曳任一指針設定時間</div>\n        <div id=\"result-board\"></div>\n        <div class=\"btn-group\">\n          <button id=\"btn-start\" class=\"main-action-btn\" data-action=\"startGame\">開始挑戰</button>\n          <button id=\"btn-submit\" class=\"main-action-btn\" data-action=\"submitAnswer\">確認答案</button>\n          <button id=\"btn-next\" class=\"main-action-btn\" data-action=\"nextRound\">下一題</button>\n        </div>\n      </section>\n    </div>\n  </main><div class=\"game-feedback\" id=\"game-feedback\" role=\"status\" aria-live=\"polite\"></div></div>";
export const stylesheet = new URL('./time.css', import.meta.url).href;
export function mount(runtime) {
const {document, window, BrainChallenge, BrainChallengeAssets, BrainChallengeConfigAPI,
  BrainChallengeLayout, BrainInterference, Date, performance, setTimeout, clearTimeout} = runtime;

        document.addEventListener('contextmenu', e => e.preventDefault());
        
        window.addEventListener("orientationchange", function() {
            setTimeout(() => { window.scrollTo(0, 0); }, 200);
        });

        let selectedQuestions = [];
        let currentRoundIndex = 0;
        const GAME_CONFIG = BrainChallengeConfigAPI.getForModule('clock');
        const totalRounds = GAME_CONFIG.rounds; 
        let totalScore = 0;
        let totalTimeMs = 0; 
        let roundStartTime = 0; 
        let hourAngle = 180, minuteAngle = 0;
        let isDragging = false, activeHand = null;

        const clock = document.getElementById('clock');
        const hourHand = document.getElementById('hour-hand');
        const minuteHand = document.getElementById('minute-hand');
        const instruction = document.getElementById('instruction');
        const statusBar = document.getElementById('status-bar');
        const resultBoard = document.getElementById('result-board');
        const scorePill = document.getElementById('score-pill');
        const scorePillWrap = document.getElementById('score-pill-wrap');
        const progressBar = document.getElementById('game-progress-bar');
        const playArea = document.querySelector('.play-area');
        const btnStart = document.getElementById('btn-start');
        const btnSubmit = document.getElementById('btn-submit');
        const btnNext = document.getElementById('btn-next');

        function initClockNumbers() {
            for (let i = GAME_CONFIG.time.hourMin; i <= GAME_CONFIG.time.hourMax; i++) {
                const numDiv = document.createElement('div');
                numDiv.className = 'number'; numDiv.innerText = i;
                const angle = (i * 30 - 90) * (Math.PI / 180);
                numDiv.style.left = `${50 + 42 * Math.cos(angle)}%`;
                numDiv.style.top = `${50 + 42 * Math.sin(angle)}%`;
                clock.appendChild(numDiv);
            }
        }

        function startGame() {
            runtime.markStarted();
            btnStart.style.display = 'none'; clock.style.display = 'block'; statusBar.style.display = 'block';
            scorePill.innerText = '0';
            BrainChallenge.gameShell.hideFeedback();
            BrainChallenge.gameShell.setProgress(progressBar, 0, totalRounds);
            selectedQuestions = [];
            while (selectedQuestions.length < totalRounds) {
                let h = Math.floor(Math.random() * (GAME_CONFIG.time.hourMax - GAME_CONFIG.time.hourMin + 1)) + GAME_CONFIG.time.hourMin;
                let m = Math.floor(Math.random() * (GAME_CONFIG.time.minuteMax - GAME_CONFIG.time.minuteMin + 1)) + GAME_CONFIG.time.minuteMin;
                let timeText = m === 0 ? `${h} 點整` : (m === 30 ? `${h} 點半` : `${h} 點 ${m} 分`);
                if (!selectedQuestions.some(q => q.hour === h && q.minute === m)) {
                    selectedQuestions.push({ text: timeText, hour: h, minute: m });
                }
            }
            currentRoundIndex = 0; totalScore = 0; totalTimeMs = 0;
            startRound();
        }

        function startRound() {
            statusBar.style.display = 'block';
            statusBar.innerHTML = `進度 <strong>${currentRoundIndex + 1} / ${totalRounds}</strong>`;
            BrainChallenge.gameShell.setProgress(progressBar, currentRoundIndex + 1, totalRounds);
            BrainChallenge.gameShell.hideFeedback();
            playArea.classList.remove('feedback-correct', 'feedback-partial', 'feedback-wrong');
            instruction.innerHTML = `請將時鐘撥到<br><span class="target-time">${selectedQuestions[currentRoundIndex].text}</span>`;
            hourAngle = 180; minuteAngle = 0; updateHandsDisplay();
            resultBoard.style.display = 'none'; btnSubmit.style.display = 'block'; btnNext.style.display = 'none';
            roundStartTime = Date.now();
        }

        function calculatePointerAngle(ex, ey) {
            const rect = clock.getBoundingClientRect();
            let deg = Math.atan2(ey - (rect.top + rect.height/2), ex - (rect.left + rect.width/2)) * 180 / Math.PI + 90;
            return (deg + 360) % 360;
        }

        function getShortestAngleDiff(a1, a2) {
            let diff = Math.abs((a1 - a2 + 360) % 360);
            return diff > 180 ? 360 - diff : diff;
        }

        clock.addEventListener('pointerdown', (e) => {
            if (btnSubmit.style.display === 'none') return;
            isDragging = true;
            clock.setPointerCapture(e.pointerId);
            const pointerAngle = calculatePointerAngle(e.clientX, e.clientY);
            activeHand = (getShortestAngleDiff(pointerAngle, hourAngle) <= getShortestAngleDiff(pointerAngle, minuteAngle)) ? 'hour' : 'minute';
            if (activeHand === 'hour') hourAngle = pointerAngle; else minuteAngle = pointerAngle;
            updateHandsDisplay();
            clock.classList.add('is-touching');
        });

        document.addEventListener('pointermove', (e) => {
            if (!isDragging || !activeHand) return;
            const pointerAngle = calculatePointerAngle(e.clientX, e.clientY);
            if (activeHand === 'hour') hourAngle = pointerAngle; else minuteAngle = pointerAngle;
            updateHandsDisplay();
        });
        
        document.addEventListener('pointerup', () => { isDragging = false; activeHand = null; clock.classList.remove('is-touching'); });

        function updateHandsDisplay() {
            hourHand.style.transform = `rotate(${hourAngle}deg)`;
            minuteHand.style.transform = `rotate(${minuteAngle}deg)`;
        }

        function submitAnswer() {
            if(btnSubmit.style.display==='none')return;
            totalTimeMs += Date.now() - roundStartTime;
            const q = selectedQuestions[currentRoundIndex];
            const targetHourAngle = ((q.hour % 12) * 30) + (q.minute / 60 * 30);
            const targetMinuteAngle = q.minute * 6;
            const diffHour = getShortestAngleDiff(hourAngle, targetHourAngle);
            const diffMin = getShortestAngleDiff(minuteAngle, targetMinuteAngle);

            let roundScore = 0, msg = "";
            if (diffHour <= GAME_CONFIG.angleTolerance.hour && diffMin <= GAME_CONFIG.angleTolerance.minute) { roundScore = GAME_CONFIG.scoring.fullScore; msg = "兩根指針都在正確位置。"; }
            else if (diffHour <= GAME_CONFIG.angleTolerance.hour || diffMin <= GAME_CONFIG.angleTolerance.minute) { roundScore = GAME_CONFIG.scoring.partialScore; msg = "一根指針位置正確。"; }
            else { roundScore = GAME_CONFIG.scoring.zeroScore; msg = "調整指針後，再確認一次。"; }

            totalScore += roundScore;
            scorePill.innerText = totalScore;
            BrainChallenge.gameShell.animateScore(scorePillWrap);
            const feedbackType = roundScore === 100 ? 'correct' : (roundScore === 50 ? 'partial' : 'wrong');
            playArea.classList.remove('feedback-correct', 'feedback-partial', 'feedback-wrong');
            void playArea.offsetWidth;
            playArea.classList.add(`feedback-${feedbackType}`);
            BrainChallenge.gameShell.feedback({
                type: feedbackType,
                title: feedbackType === 'correct' ? '位置正確' : feedbackType === 'partial' ? '接近目標' : '再看一次位置',
                message: msg,
                duration: 1100
            });
            resultBoard.innerHTML = `本題得分：<strong>${roundScore} 分</strong><br><span style="font-size:1rem; font-weight:normal;">${msg}</span>`;
            resultBoard.style.display = 'block'; btnSubmit.style.display = 'none';
            btnNext.style.display = 'block'; btnNext.innerText = currentRoundIndex === totalRounds - 1 ? "看最終結果" : "下一題";
        }

        function nextRound() {
            playArea.classList.remove('feedback-correct', 'feedback-partial', 'feedback-wrong');
            currentRoundIndex++;
            if (currentRoundIndex < totalRounds) startRound(); else showFinalResult();
        }

        function showFinalResult() {
            BrainChallenge.audio?.play?.('complete');
            BrainChallenge.gameShell.setProgress(progressBar, totalRounds, totalRounds);
            BrainChallenge.gameShell.hideFeedback();
            statusBar.style.display = 'none';
            instruction.innerHTML = `
                <div class="finish-card">
                    <div class="finish-title">本關完成</div>
                    <div>你的空間認知挑戰結果</div>
                    <div class="score-big">${Math.round(totalScore / totalRounds)}</div>
                    <div class="finish-meta">平均得分</div>
                </div>`;
            clock.parentElement.style.display = 'none';
            btnNext.style.display = 'none';

            const avgScore = Math.round(totalScore / totalRounds);
            const totalSeconds = Math.floor(totalTimeMs / 1000);
            const timeString = totalSeconds >= 60 ? `${Math.floor(totalSeconds/60)}分${totalSeconds%60}秒` : `${totalSeconds}秒`;

            const gameRecord = {
                gameName: "空間認知",
                playerName: BrainChallenge.player.getName() || "訪客",
                score: avgScore,
                totalSeconds: totalSeconds,
                timeText: timeString,
                age: BrainChallenge.player.getAge() || "未設定",
                timestamp: new Date().toLocaleString()
            };
            if (window.BrainChallenge) { BrainChallenge.scores.save(gameRecord); } else { let history = JSON.parse(localStorage.getItem('game_history') || "[]"); history.push(gameRecord); localStorage.setItem('game_history', JSON.stringify(history)); }

            resultBoard.innerHTML = `
                <div style="font-size:1.08rem;margin-bottom:4px;">本關平均得分</div>
                <div style="font-size:2.35rem;color:#1486c3;font-weight:1000;">${avgScore} 分</div>
                <div style="margin:4px 0 14px;color:#607785;font-size:.92rem;">作答總時間：<strong>${timeString}</strong></div>
                <div class="finish-actions">
                    <button class="again" data-action="retry">再挑戰一次</button>
                    <button class="home" data-action="home">回到工坊</button>
                </div>`;
            resultBoard.style.display = 'block';
        }
        initClockNumbers();
    
runtime.bindActions({startGame,submitAnswer,nextRound});

}
