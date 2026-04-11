const calendarDays = document.getElementById('calendar-days');
const yearSelect = document.getElementById('year-select');
const monthSelect = document.getElementById('month-select');
const clickModeRadios = document.querySelectorAll('input[name="click-mode"]');
const colorPickerGroup = document.getElementById('color-picker-group');
const bgColorPicker = document.getElementById('bg-color-picker');
const bgColorCode = document.getElementById('bg-color-code');
const textColorPicker = document.getElementById('text-color-picker');
const textColorCode = document.getElementById('text-color-code');
const pdfButton = document.getElementById('pdf-button');
const copyButton = document.getElementById('copy-button');

let currentDate = new Date();
let holidays = {}; // 取得した祝日データを格納するオブジェクト
let activeInputArea = null; // 現在選択されている入力欄を記録
let currentDefaultTextColor = textColorPicker.value; // 現在の選択色

function renderCalendar(date) {
    calendarDays.innerHTML = '';
    
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // --- 口座振替日の計算ロジック ---
    // 指定日が営業日（平日かつ祝日でない）かを判定するヘルパー関数
    function isBusinessDay(d) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) return false; // 土日ならfalse
        const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (holidays[formatted]) return false; // 祝日ならfalse
        return true;
    }

    // 27日が営業日でなければ、翌営業日まで日付を進める
    let debitDate = new Date(year, month, 27);
    while (!isBusinessDay(debitDate)) {
        debitDate.setDate(debitDate.getDate() + 1);
    }

    // 月の最初の日と最後の日を取得
    let firstDayIndex = new Date(year, month, 1).getDay();
    // 月曜始まりに調整 (月曜: 0, 火曜: 1, ..., 日曜: 6)
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    // 月初めの空白を埋める
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('calendar-day', 'empty');
        calendarDays.appendChild(emptyDiv);
    }
    
    // 日付を生成する
    for (let i = 1; i <= lastDay; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day');

        const currentDay = new Date(year, month, i);
        const dayOfWeek = currentDay.getDay();

        // 曜日クラスを追加（0:日曜, 6:土曜）
        if (dayOfWeek === 0) {
            dayDiv.classList.add('sunday');
        } else if (dayOfWeek === 6) {
            dayDiv.classList.add('saturday');
        }
        
        // 日付と祝日名を入れるヘッダー領域
        const dayHeader = document.createElement('div');
        dayHeader.classList.add('day-header');

        // 日付番号の要素
        const dateSpan = document.createElement('span');
        dateSpan.classList.add('date-number');
        dateSpan.textContent = i;

        // 祝日名の要素
        const holidaySpan = document.createElement('span');
        holidaySpan.classList.add('holiday-name');

        dayHeader.appendChild(dateSpan);
        dayHeader.appendChild(holidaySpan);
        
        // 直接入力できるエリア（編集可能）
        const inputArea = document.createElement('div');
        inputArea.classList.add('day-input');
        inputArea.contentEditable = "true";

        // 入力欄にフォーカスが当たったときに、そのマスを選択中として記録し、色を設定
        inputArea.addEventListener('focus', () => {
            activeInputArea = inputArea;
            if (!inputArea.style.color) {
                inputArea.style.color = currentDefaultTextColor;
            }
        });

        // 祝日かどうかを判定
        let isHoliday = false;
        let holidayNameStr = '';
        const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        if (holidays[formattedDate]) {
            isHoliday = true;
            dayDiv.classList.add('holiday');
            holidayNameStr = holidays[formattedDate];
            // 「振替休日」が長すぎるため「(振)」に短縮する
            holidayNameStr = holidayNameStr.replace(/\s?振替休日/, '(振)');
            // 祝日名をヘッダーに設定
            holidaySpan.textContent = holidayNameStr;
        }
        
        // 休・退会/お手続〆日を判定して追記
        if (i === 10) {
            const existingText = inputArea.innerHTML;
            const newText = '<span class="auto-generated-text">休・退会\nお手続〆日</span>';
            inputArea.innerHTML = (existingText ? existingText + '\n' : '') + newText;
        }
        
        // 口座振替引き落とし日を判定して追記
        if (debitDate.getMonth() === month && i === debitDate.getDate()) {
            const existingText = inputArea.innerHTML;
            const newText = `<span class="auto-generated-text">${month + 1}月分会費\n引き落とし日\n（口座振替の方）</span>`;
            inputArea.innerHTML = (existingText ? existingText + '\n' : '') + newText;
        }
        
        // マスのクリックイベント（モードに応じて処理を切り替え）
        dayDiv.addEventListener('click', (e) => {
            if (e.target === inputArea) {
                return;
            }

            const currentMode = document.querySelector('input[name="click-mode"]:checked').value;

            if (currentMode === 'no-staff') {
                // 塗りつぶしモードのスタイルを解除
                dayDiv.style.backgroundColor = '';

                // 「スタッフ不在日」をトグル
                if (dayDiv.classList.contains('no-staff-day')) {
                    dayDiv.classList.remove('no-staff-day');
                    inputArea.innerHTML = inputArea.innerHTML.replace(/\n?<span class="no-staff-text">スタッフ不在日\nNO STAFF DAY<\/span>/g, '').replace(/\n?ノースタッフデー/g, '').trim();
                    holidaySpan.innerHTML = holidaySpan.innerHTML.replace(/<span class="no-staff-text small-text">スタッフ不在日<br>NO STAFF DAY<\/span>/g, '');
                    if (isHoliday) {
                        holidaySpan.textContent = holidayNameStr; // 祝日名を復元
                    }
                } else {
                    dayDiv.classList.add('no-staff-day');
                    const existingText = inputArea.textContent.trim();
                    
                    if (existingText !== '') {
                        // 文字が入力されている場合は、祝日名領域に小さく出す
                        holidaySpan.innerHTML = '<span class="no-staff-text small-text">スタッフ不在日<br>NO STAFF DAY</span>';
                    } else {
                        // 文字がない場合は入力欄に大きく出す
                        const currentInput = inputArea.innerHTML;
                        inputArea.innerHTML = (currentInput ? currentInput + '\n' : '') + '<span class="no-staff-text">スタッフ不在日\nNO STAFF DAY</span>';
                    }
                }
            } else { // currentMode === 'coloring'
                // ノースタッフデーモードのスタイルとテキストを解除
                if (dayDiv.classList.contains('no-staff-day')) {
                    dayDiv.classList.remove('no-staff-day');
                    inputArea.innerHTML = inputArea.innerHTML.replace(/\n?<span class="no-staff-text">スタッフ不在日\nNO STAFF DAY<\/span>/g, '').replace(/\n?ノースタッフデー/g, '').trim();
                    holidaySpan.innerHTML = holidaySpan.innerHTML.replace(/<span class="no-staff-text small-text">スタッフ不在日<br>NO STAFF DAY<\/span>/g, '');
                    if (isHoliday) {
                        holidaySpan.textContent = holidayNameStr; // 祝日名を復元
                    }
                }

                // 色のトグル（色がついていれば消し、なければ塗る）
                dayDiv.style.backgroundColor = dayDiv.style.backgroundColor ? '' : bgColorPicker.value;
            }
        });
        
        dayDiv.appendChild(dayHeader);
        dayDiv.appendChild(inputArea);
        calendarDays.appendChild(dayDiv);
    }
}

// 年のプルダウンの選択肢を生成（現在年から前後5年）
function populateYearSelect(currentYear) {
    yearSelect.innerHTML = '';
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        if (i === currentYear) {
            option.selected = true;
        }
        yearSelect.appendChild(option);
    }
}

// プルダウンの変更イベント
function handleDateChange() {
    const selectedYear = parseInt(yearSelect.value);
    const selectedMonth = parseInt(monthSelect.value);
    currentDate = new Date(selectedYear, selectedMonth, 1);
    renderCalendar(currentDate);
}

// 日本の祝日データを取得する関数
async function fetchHolidays() {
    try {
        // 無料で利用できる日本の祝日API
        const response = await fetch('https://holidays-jp.github.io/api/v1/date.json');
        if (!response.ok) {
            throw new Error('祝日データの取得に失敗しました。');
        }
        holidays = await response.json();
        console.log('祝日データを取得しました。');
    } catch (error) {
        console.error(error);
        alert('祝日データの取得に失敗しました。画面をリロードしてみてください。');
    }
}

yearSelect.addEventListener('change', handleDateChange);
monthSelect.addEventListener('change', handleDateChange);

// カラーピッカーとカラーコード入力の同期
function syncColorInputs(picker, code) {
    picker.addEventListener('input', () => {
        code.value = picker.value.toUpperCase();
    });
    code.addEventListener('input', () => {
        const hex = code.value;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            picker.value = hex;
        }
    });
}

syncColorInputs(bgColorPicker, bgColorCode);
syncColorInputs(textColorPicker, textColorCode);

// 文字色の適用
function updateTextColor() {
    currentDefaultTextColor = textColorPicker.value;
    // 選択中の入力欄があれば、そのマスの文字色だけを変更する
    if (activeInputArea) {
        activeInputArea.style.color = currentDefaultTextColor;
    }
}

textColorPicker.addEventListener('input', updateTextColor);
textColorCode.addEventListener('input', () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(textColorCode.value)) {
        updateTextColor();
    }
});

clickModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'coloring') {
            colorPickerGroup.style.display = 'block';
        } else {
            colorPickerGroup.style.display = 'none';
        }
    });
});

// PDF化ボタンのイベント
pdfButton.addEventListener('click', () => {
    window.print();
});

// 画像としてコピーボタンのイベント
copyButton.addEventListener('click', async () => {
    if (typeof html2canvas === 'undefined') {
        alert('画像生成処理の準備ができていません。画面を再読み込みするか、少し待ってから再度お試しください。');
        return;
    }

    const calendarContainer = document.querySelector('.calendar-container');
    const originalText = copyButton.textContent;
    
    try {
        copyButton.textContent = 'コピー中...';
        copyButton.disabled = true;
        
        // カレンダー領域を画像（Canvas）に変換 (余白を削って画像化)
        const originalCanvas = await html2canvas(calendarContainer, {
            // 画質を担保するために、元の描画解像度を高めに設定
            scale: window.devicePixelRatio > 1 ? window.devicePixelRatio : 2,
            onclone: (clonedDocument) => {
                const clonedContainer = clonedDocument.querySelector('.calendar-container');
                clonedContainer.style.padding = '0';
                clonedContainer.style.borderRadius = '0';
                clonedContainer.style.boxShadow = 'none';
            }
        });

        // 大きさを等比で2割削る（80%にする）ための新しいCanvasを作成
        const scaledCanvas = document.createElement('canvas');
        const scaleFactor = 0.8; // 80%
        scaledCanvas.width = originalCanvas.width * scaleFactor;
        scaledCanvas.height = originalCanvas.height * scaleFactor;

        const ctx = scaledCanvas.getContext('2d');
        // 縮小時の画質（解像度）を綺麗に保つための設定
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 高解像度で描画した元のCanvasを、新しいCanvasに縮小して描画
        ctx.drawImage(originalCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        
        // 縮小したCanvasを画像データ（Blob）に変換してクリップボードに書き込む
        scaledCanvas.toBlob(async (blob) => {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            alert('カレンダーを画像としてコピーしました！\nPowerPoint等に「貼り付け(Ctrl+V / Cmd+V)」できます。');
        }, 'image/png');
    } catch (err) {
        console.error('コピーに失敗しました:', err);
        alert('コピーに失敗しました。');
    } finally {
        copyButton.textContent = originalText;
        copyButton.disabled = false;
    }
});

// 初期化処理
async function init() {
    await fetchHolidays(); // 最初に祝日データを取得する
    populateYearSelect(currentDate.getFullYear());
    monthSelect.value = currentDate.getMonth(); // 現在の月に設定
    updateTextColor(); // 文字色の初期設定を適用
    renderCalendar(currentDate);
}

init();