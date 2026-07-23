        //====================
        // 定数
        //====================
        const MS_PER_SECOND = 1000;
        const SECONDS_PER_MINUTE = 60;
        const MS_PER_MINUTE = MS_PER_SECOND * SECONDS_PER_MINUTE;

        const DEFAULT_WORK_MINUTES = 25;
        const DEFAULT_BREAK_MINUTES = 5;

        let timerIdx = null;
        let startTime = 0;
        let elapsedTime = 0;
        let logs = JSON.parse(localStorage.getItem('study_logs')) || [];
        let todos = JSON.parse(localStorage.getItem('study_todos')) || [];
        let pomodoroStudyMinutes = 0; // ポモドーロで貯まった集中時間
        // 🍅 ポモドーロモード用の状態管理変数
        let currentMode = 'normal'; // 'normal' または 'pomodoro'
        let isPomodoroWorking = true; // true: 25分集中、false: 5分休憩
        let pomodoroTimerIdx = null;
        let currentSessionStart = 0; // 今の集中タイム開始時刻
        // 🍅 通常モードとポモドーロモードを切り替える関数
        function switchMode(mode) {
            currentMode = mode;

            // ★ ポモドーロ設定の表示・非表示
            const settings = document.getElementById('pomodoroSettings');
            settings.style.display = (mode === 'pomodoro') ? 'block' : 'none';

            if (timerIdx) clearInterval(timerIdx);
            elapsedTime = 0;

            if (mode === 'pomodoro') {
                isPomodoroWorking = true;
                updatePomodoroPreview();   // ← 保存されている集中時間を表示
            } else {
                document.getElementById('timerDisplay').innerText = "00:00:00";
            }
        }

        const colors = { '英語': '#0078d4', '数学': '#e81123', '国語': '#ff8c00', '理科': '#107c41', '社会': '#8660a9', 'その他': '#797775' };

        function updateTimerDisplay() {
            const totalMs = Date.now() - startTime + elapsedTime;
            const totalSecs = Math.floor(totalMs / MS_PER_SECOND);
            const hrs = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
            const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
            const secs = (totalSecs % 60).toString().padStart(2, '0');
            document.getElementById('timerDisplay').innerText = `${hrs}:${mins}:${secs}`;
        }
        // 🍅 ポモドーロモード専用のカウントダウン表示関数
        function updatePomodoroDisplay() {
            const workMs = Number(document.getElementById('workMinutes').value) * MS_PER_MINUTE;
            const breakMs = Number(document.getElementById('breakMinutes').value) * MS_PER_MINUTE;
            const targetMs = isPomodoroWorking ? workMs : breakMs;

            const elapsedMs = Date.now() - startTime;
            const remainingMs = targetMs - elapsedMs;

            if (remainingMs <= 0) {
                handlePomodoroEnd();
                return;
            }

            const totalSecs = Math.floor(remainingMs / MS_PER_SECOND);
            const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
            const secs = (totalSecs % 60).toString().padStart(2, '0');
            document.getElementById('timerDisplay').innerText = `${mins}:${secs}`;
        }

        // 💾 ポモドーロ設定を保存
        function savePomodoroSettings() {
            localStorage.setItem(
                'pomodoro_settings',
                JSON.stringify({
                    work: document.getElementById('workMinutes').value,
                    rest: document.getElementById('breakMinutes').value
                })
            );
        }

        function startTimer() {
            startTime = Date.now();
            if (currentMode === 'pomodoro') {
                lockPomodoroSettings();

                timerIdx = setInterval(updatePomodoroDisplay, MS_PER_SECOND);
                currentSessionStart = Date.now();
            } else {
                timerIdx = setInterval(updateTimerDisplay, MS_PER_SECOND);
            }
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = false;
            document.getElementById('subjectSelect').disabled = true;
        }


        function stopTimer() {
            clearInterval(timerIdx);

            if (currentMode === 'normal') {

                const totalMs = Date.now() - startTime + elapsedTime;
                const mins = Math.floor(totalMs / MS_PER_MINUTE);
                if (mins >= 1) {
                    const subject = document.getElementById('subjectSelect').value;
                    const today = new Date().toLocaleDateString('ja-JP');
                    logs.unshift({ date: today, subject: subject, minutes: mins });
                    localStorage.setItem('study_logs', JSON.stringify(logs));
                } else {
                    alert("1分未満の勉強時間は記録されません。ここからが本番です！");
                }
            } else {

                const currentMinutes =
                    isPomodoroWorking
                        ? Math.floor((Date.now() - currentSessionStart) / MS_PER_MINUTE)
                        : 0;

                const totalMinutes = pomodoroStudyMinutes + currentMinutes;

                if (totalMinutes >= 1) {


                    const subject = document.getElementById('subjectSelect').value;
                    const today = new Date().toLocaleDateString('ja-JP');

                    logs.unshift({
                        date: today,
                        subject: subject,
                        minutes: totalMinutes
                    });

                    localStorage.setItem('study_logs', JSON.stringify(logs));

                    pomodoroStudyMinutes = 0;
                    currentSessionStart = 0;
                }

                updatePomodoroPreview();
            }

            elapsedTime = 0;

            unlockTimerUI();

            render();
        }

        //====================
        // タイマーUIを通常状態に戻す
        //====================
        function unlockTimerUI() {
            document.getElementById('startBtn').disabled = false;
            document.getElementById('stopBtn').disabled = true;
            document.getElementById('subjectSelect').disabled = false;

            // 🍅 ポモドーロ設定
            unlockPomodoroSettings();
        }

        //====================
        // ポモドーロ設定をロック
        //====================
        function lockPomodoroSettings() {
            document.getElementById('workMinutes').disabled = true;
            document.getElementById('breakMinutes').disabled = true;
        }

        //====================
        // ポモドーロ設定のロック解除
        //====================
        function unlockPomodoroSettings() {
            document.getElementById('workMinutes').disabled = false;
            document.getElementById('breakMinutes').disabled = false;
        }

        function render() {
            const todayStr = new Date().toLocaleDateString('ja-JP');
            let todayMins = 0;
            let totalMins = 0;
            let subjectTotals = { '英語': 0, '数学': 0, '国語': 0, '理科': 0, '社会': 0, 'その他': 0 };

            let html = '';
            logs.forEach(log => {
                totalMins += log.minutes;
                if (log.date === todayStr) todayMins += log.minutes;
                if (subjectTotals[log.subject] !== undefined) subjectTotals[log.subject] += log.minutes;
                html += `<tr><td>${log.date}</td><td>${log.subject}</td><td>${log.minutes} 分</td></tr>`;
            });
            document.getElementById('historyBody').innerHTML = html;

            // 【修正点①】デカ文字部分を〇時間〇分表示に変更
            document.getElementById('todayTotal').innerText = formatMinutesToHoursAndMinutes(todayMins);
            document.getElementById('allTotal').innerText = formatMinutesToHoursAndMinutes(totalMins);

            let maxMinutes = Math.max(...Object.values(subjectTotals), 1);
            let graphHtml = '';
            Object.keys(subjectTotals).forEach(sub => {
                const mins = subjectTotals[sub];
                const pct = (mins / maxMinutes) * 100;
                // 【修正点②】各教科の数値を〇時間〇分表示に変更
                graphHtml += `
                <div class="bar-row">
                    <div class="bar-label">${sub}</div>
                    <div class="bar-outer">
                        <div class="bar-inner" style="width: ${pct}%; background-color: ${colors[sub] || '#ccc'}"></div>
                    </div>
                    <div class="bar-time">${formatMinutesToHoursAndMinutes(mins)}</div>
                </div>`;
            });
            document.getElementById('graphs').innerHTML = graphHtml;
        }

        function clearData() {
            if (confirm("これまでの全勉強データをリセットしますか？")) {
                localStorage.removeItem('study_logs');
                logs = [];
                render();
            }
        }

        // 分を「〇時間〇分」または「〇分」の文字列に変換する関数
        function formatMinutesToHoursAndMinutes(totalMinutes) {
            if (totalMinutes === 0) return "0分";

            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;

            if (hours > 0) {
                return `${hours}時間 ${minutes}分`;
            } else {
                return `${minutes}分`;
            }
        }

        // --- To Doリストの追加と画面描画 ---
        function addTodo() {
            const input = document.getElementById('todoInput');
            const text = input.value.trim();
            if (text === '') return;

            todos.push({ text: text, completed: false });
            localStorage.setItem('study_todos', JSON.stringify(todos));
            input.value = '';
            renderTodos();
        }

        function renderTodos() {
            let html = '';
            todos.forEach((todo, idx) => {
                const textStyle = todo.completed ? 'text-decoration: line-through; color: #aaa;' : 'color: #333;';
                const checked = todo.completed ? 'checked' : '';
                html += `
            <li style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1; ${textStyle}">
                    <input type="checkbox" ${checked} onchange="toggleTodo(${idx})" style="transform: scale(1.1);">
                    <span>${todo.text}</span>
                </label>
                <button onclick="deleteTodo(${idx})" style="background: none; border: none; color: #ff8c00; cursor: pointer; font-size: 13px; font-weight: bold; padding: 0; margin: 0;">削除</button>
            </li>`;
            });
            document.getElementById('todoList').innerHTML = html;
        }
        function toggleTodo(index) {
            todos[index].completed = !todos[index].completed;
            localStorage.setItem('study_todos', JSON.stringify(todos));
            renderTodos();
        }

        function deleteTodo(index) {
            todos.splice(index, 1);
            localStorage.setItem('study_todos', JSON.stringify(todos));
            renderTodos();
        }

        // エンターキーでもTo Doを追加できるように設定
        document.getElementById('todoInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTodo();
        });

        // 💾 保存されているポモドーロ設定を読み込む
        const savedPomodoro = JSON.parse(
            localStorage.getItem('pomodoro_settings')
        );

        if (savedPomodoro) {
            document.getElementById('workMinutes').value = savedPomodoro.work;
            document.getElementById('breakMinutes').value = savedPomodoro.rest;
        }

        // 初回読み込み時にTo Doリストを描画
        renderTodos();

        render();
        // 🍅 時間がゼロになったら自動で次のフェーズへ
        function handlePomodoroEnd() {

            clearInterval(timerIdx);

            const work = Number(document.getElementById('workMinutes').value);
            const rest = Number(document.getElementById('breakMinutes').value);

            if (isPomodoroWorking) {
                pomodoroStudyMinutes += work;
                currentSessionStart = Date.now();

                alert(`${work}分間の集中タイム終了！☕ ${rest}分休憩します！`);

                isPomodoroWorking = false;

            } else {

                alert(`${rest}分間の休憩終了！🔥 次は${work}分集中です！`);

                isPomodoroWorking = true;

            }

            // 次のフェーズ開始
            startTime = Date.now();

            timerIdx = setInterval(updatePomodoroDisplay, MS_PER_SECOND);
        }

        function updatePomodoroPreview() {

            if (currentMode !== 'pomodoro') return;

            const mins = isPomodoroWorking
                ? Number(document.getElementById('workMinutes').value)
                : Number(document.getElementById('breakMinutes').value);

            document.getElementById('timerDisplay').innerText =
                `${String(mins).padStart(2, '0')}:00`;
        }