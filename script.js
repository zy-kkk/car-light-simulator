document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const lowBeamBtn = document.getElementById('lowBeam');
    const highBeamBtn = document.getElementById('highBeam');
    const alternateBtn = document.getElementById('alternate');
    const widthLightBtn = document.getElementById('widthLight');
    const turnOffBtn = document.getElementById('turnOff');
    const startBtn = document.getElementById('startBtn');
    
    const statusEl = document.getElementById('status');
    const questionEl = document.getElementById('question');
    const timerEl = document.getElementById('timer');
    const resultEl = document.getElementById('result');
    const correctAnswerEl = document.getElementById('correctAnswer');
    
    const totalScoreEl = document.getElementById('totalScore');
    const correctCountEl = document.getElementById('correctCount');
    const wrongCountEl = document.getElementById('wrongCount');
    
    const leftLight = document.querySelector('.left-light');
    const rightLight = document.querySelector('.right-light');
    const leftWidthLight = document.querySelector('.left-width-light');
    const rightWidthLight = document.querySelector('.right-width-light');
    
    // 错题记录和训练记录相关元素
    const wrongQuestionsTab = document.getElementById('wrongQuestionsTab');
    const historyRecordsTab = document.getElementById('historyRecordsTab');
    const wrongQuestionsPanel = document.getElementById('wrongQuestionsPanel');
    const historyRecordsPanel = document.getElementById('historyRecordsPanel');
    const wrongQuestionsList = document.getElementById('wrongQuestionsList');
    const historyRecordsList = document.getElementById('historyRecordsList');
    
    // 添加到主屏幕提示元素
    const addToHomeTip = document.getElementById('addToHomeTip');
    
    // 检测是否为iOS设备，并且不是从主屏幕打开的
    function detectiOS() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isStandalone = window.navigator.standalone;
        
        // 如果是iOS设备且不是从主屏幕打开的，显示提示
        if (isIOS && !isStandalone) {
            // 检查是否已经显示过提示
            const hasShownTip = localStorage.getItem('hasShownAddToHomeTip');
            
            if (!hasShownTip) {
                setTimeout(function() {
                    addToHomeTip.style.display = 'block';
                    
                    // 设置提示已显示标记，7天内不再显示
                    const now = new Date().getTime();
                    localStorage.setItem('hasShownAddToHomeTip', now);
                }, 5000);
            } else {
                // 如果7天前显示过，则再次显示
                const lastShownTime = parseInt(hasShownTip);
                const now = new Date().getTime();
                const sevenDays = 7 * 24 * 60 * 60 * 1000;
                
                if (now - lastShownTime > sevenDays) {
                    setTimeout(function() {
                        addToHomeTip.style.display = 'block';
                        localStorage.setItem('hasShownAddToHomeTip', now);
                    }, 5000);
                }
            }
        }
    }
    
    // 移动设备触摸优化
    function enableTouchOptimization() {
        // 对于移动设备，禁用双击缩放
        document.addEventListener('touchstart', function(event) {
            if (event.touches.length > 1) {
                event.preventDefault();
            }
        }, { passive: false });
        
        // 禁用双指缩放
        document.addEventListener('touchmove', function(event) {
            if (event.touches.length > 1) {
                event.preventDefault();
            }
        }, { passive: false });
        
        // 修复iOS点击延迟
        const allButtons = document.querySelectorAll('button');
        allButtons.forEach(function(button) {
            button.addEventListener('touchstart', function() {}, { passive: true });
        });
    }
    
    // 状态变量
    let currentLightState = {
        lowBeam: false,
        highBeam: false,
        widthLight: false
    };
    
    let timerInterval;
    let alternateTimeout;
    let alternateCount = 0;
    let currentQuestionIndex = 0;
    let totalScore = 100;
    let correctCount = 0;
    let wrongCount = 0;
    let isAnswering = false;
    let timeLeft = 5;
    let wrongQuestions = [];
    let historyRecords = [];
    let hasOperatedLights = false; // 标记用户是否已操作灯光
    let checkAnswerTimeout; // 用于存储操作后的延迟检查计时器
    
    // 加载本地存储的错题记录和训练记录
    function loadLocalData() {
        const savedWrongQuestions = localStorage.getItem('wrongQuestions');
        const savedHistoryRecords = localStorage.getItem('historyRecords');
        
        if (savedWrongQuestions) {
            wrongQuestions = JSON.parse(savedWrongQuestions);
            updateWrongQuestionsList();
        }
        
        if (savedHistoryRecords) {
            historyRecords = JSON.parse(savedHistoryRecords);
            updateHistoryRecordsList();
        }
    }
    
    // 保存错题记录到本地存储
    function saveWrongQuestions() {
        localStorage.setItem('wrongQuestions', JSON.stringify(wrongQuestions));
    }
    
    // 保存训练记录到本地存储
    function saveHistoryRecords() {
        localStorage.setItem('historyRecords', JSON.stringify(historyRecords));
    }
    
    // 更新错题记录列表
    function updateWrongQuestionsList() {
        if (wrongQuestions.length === 0) {
            wrongQuestionsList.innerHTML = '<p class="empty-record">暂无错题记录</p>';
            return;
        }
        
        wrongQuestionsList.innerHTML = '';
        
        wrongQuestions.forEach((item, index) => {
            const recordItem = document.createElement('div');
            recordItem.className = 'record-item wrong-item';
            
            const questionText = document.createElement('div');
            questionText.className = 'question-text';
            questionText.textContent = `${index + 1}. ${item.question}`;
            
            const answerText = document.createElement('div');
            answerText.className = 'answer-text';
            answerText.textContent = `正确答案: ${getAnswerText(item.answer)}`;
            
            const dateText = document.createElement('div');
            dateText.className = 'date-text';
            dateText.textContent = new Date(item.date).toLocaleString();
            
            recordItem.appendChild(questionText);
            recordItem.appendChild(answerText);
            recordItem.appendChild(dateText);
            
            wrongQuestionsList.appendChild(recordItem);
        });
    }
    
    // 更新训练记录列表
    function updateHistoryRecordsList() {
        if (historyRecords.length === 0) {
            historyRecordsList.innerHTML = '<p class="empty-record">暂无训练记录</p>';
            return;
        }
        
        historyRecordsList.innerHTML = '';
        
        historyRecords.forEach((record) => {
            const recordItem = document.createElement('div');
            recordItem.className = 'record-item history-item';
            
            const dateDiv = document.createElement('div');
            dateDiv.className = 'date';
            dateDiv.textContent = new Date(record.date).toLocaleString();
            
            const scoreDiv = document.createElement('div');
            scoreDiv.className = 'score';
            scoreDiv.textContent = `得分: ${record.score}/100`;
            
            recordItem.appendChild(dateDiv);
            recordItem.appendChild(scoreDiv);
            
            historyRecordsList.appendChild(recordItem);
        });
    }
    
    // 添加错题记录
    function addWrongQuestion(question) {
        // 检查是否已经存在相同的错题
        const exists = wrongQuestions.some(q => q.id === question.id);
        
        if (!exists) {
            const wrongQuestion = {
                id: question.id,
                question: question.question,
                answer: question.answer,
                date: new Date().getTime()
            };
            
            wrongQuestions.push(wrongQuestion);
            saveWrongQuestions();
            updateWrongQuestionsList();
        }
    }
    
    // 添加训练记录
    function addHistoryRecord(score) {
        const record = {
            date: new Date().getTime(),
            score: score
        };
        
        historyRecords.push(record);
        
        // 只保留最近的10条记录
        if (historyRecords.length > 10) {
            historyRecords = historyRecords.slice(-10);
        }
        
        saveHistoryRecords();
        updateHistoryRecordsList();
    }
    
    // 将答案代码转换为可读文本
    function getAnswerText(answerCode) {
        switch(answerCode) {
            case "lowBeam":
                return "近光灯";
            case "highBeam":
                return "远光灯";
            case "alternate3":
                return "远近光灯交替三下";
            case "widthLightOnly":
                return "关闭近光灯开启示廓灯";
            default:
                return "未知操作";
        }
    }
    
    // 问题数据
    const questions = [
        {
            id: 1,
            question: "同方向近距离跟车行驶，开启什么灯光？",
            answer: "lowBeam",
            answered: false
        },
        {
            id: 2,
            question: "通过急弯、玻路、拱桥、人行橫道，开启什么灯光？",
            answer: "alternate3",
            answered: false
        },
        {
            id: 3,
            question: "会车时开启什么灯光？",
            answer: "lowBeam",
            answered: false
        },
        {
            id: 4,
            question: "超车时开启什么灯光？",
            answer: "alternate3",
            answered: false
        },
        {
            id: 5,
            question: "在有路灯、照明良好的道路行驶，开启什么灯光？",
            answer: "lowBeam",
            answered: false
        },
        {
            id: 6,
            question: "在路边临时停车，开启什么灯光？",
            answer: "widthLightOnly",
            answered: false
        },
        {
            id: 7,
            question: "进入无照明、照明不良的道路行驶，开启什么灯光？",
            answer: "highBeam",
            answered: false
        },
        {
            id: 8,
            question: "通过路口时，开启什么灯光？",
            answer: "lowBeam",
            answered: false
        },
        {
            id: 9,
            question: "没有交通信号灯控制的路口时，开启什么灯光？",
            answer: "alternate3",
            answered: false
        }
    ];
    
    // 初始化
    function init() {
        turnOffAllLights();
        totalScoreEl.textContent = "100";
        correctCountEl.textContent = "0";
        wrongCountEl.textContent = "0";
        resultEl.textContent = "";
        resultEl.className = "result";
        correctAnswerEl.textContent = "";
        
        totalScore = 100;
        correctCount = 0;
        wrongCount = 0;
        currentQuestionIndex = 0;
        hasOperatedLights = false;
        
        if (checkAnswerTimeout) {
            clearTimeout(checkAnswerTimeout);
        }
        
        questions.forEach(q => q.answered = false);
        
        statusEl.textContent = "准备开始";
        questionEl.textContent = "";
    }
    
    // 检测灯光操作变化并启动提前检查
    function detectLightOperation() {
        if (isAnswering && !hasOperatedLights) {
            hasOperatedLights = true;
            
            // 如果距离计时结束还有1秒以上的时间，则设定1秒后检查答案
            if (timeLeft > 1) {
                if (checkAnswerTimeout) {
                    clearTimeout(checkAnswerTimeout);
                }
                checkAnswerTimeout = setTimeout(function() {
                    clearInterval(timerInterval);
                    checkAnswer();
                }, 1000);
            }
            // 如果只剩1秒或更少，就让计时器正常结束
        }
    }
    
    // 控制灯光的函数
    function turnOnLowBeam() {
        leftLight.classList.add('low-beam-on');
        rightLight.classList.add('low-beam-on');
        currentLightState.lowBeam = true;
        currentLightState.highBeam = false;
        leftLight.classList.remove('high-beam-on');
        rightLight.classList.remove('high-beam-on');
        detectLightOperation();
    }
    
    function turnOnHighBeam() {
        leftLight.classList.add('high-beam-on');
        rightLight.classList.add('high-beam-on');
        currentLightState.highBeam = true;
        currentLightState.lowBeam = false;
        leftLight.classList.remove('low-beam-on');
        rightLight.classList.remove('low-beam-on');
        detectLightOperation();
    }
    
    function turnOnWidthLight() {
        leftWidthLight.classList.add('on');
        rightWidthLight.classList.add('on');
        currentLightState.widthLight = true;
        detectLightOperation();
    }
    
    function turnOffAllLights() {
        leftLight.classList.remove('low-beam-on', 'high-beam-on');
        rightLight.classList.remove('low-beam-on', 'high-beam-on');
        leftWidthLight.classList.remove('on');
        rightWidthLight.classList.remove('on');
        
        currentLightState.lowBeam = false;
        currentLightState.highBeam = false;
        currentLightState.widthLight = false;
        
        clearTimeout(alternateTimeout);
        alternateCount = 0;
        
        if (isAnswering) {
            detectLightOperation();
        }
    }
    
    function alternateBeams() {
        clearTimeout(alternateTimeout);
        alternateCount = 0;
        
        function toggle() {
            if (currentLightState.highBeam) {
                turnOnLowBeam();
            } else {
                turnOnHighBeam();
            }
            
            alternateCount++;
            
            if (alternateCount < 6) {  // 确保完成3个完整交替（低-高-低）
                alternateTimeout = setTimeout(toggle, 300);
            } else {
                detectLightOperation();
            }
        }
        
        toggle();
        detectLightOperation();
    }
    
    // 开始答题
    function startQuiz() {
        isAnswering = true;
        currentQuestionIndex = 0;
        nextQuestion();
    }
    
    // 下一题
    function nextQuestion() {
        if (currentQuestionIndex >= questions.length) {
            endQuiz();
            return;
        }
        
        turnOffAllLights();
        let currentQuestion = questions[currentQuestionIndex];
        
        statusEl.textContent = `第 ${currentQuestion.id} 题`;
        questionEl.textContent = currentQuestion.question;
        correctAnswerEl.textContent = "";
        
        // 语音提示（模拟）
        resultEl.textContent = "";
        resultEl.className = "result";
        
        // 重置操作标记
        hasOperatedLights = false;
        
        if (checkAnswerTimeout) {
            clearTimeout(checkAnswerTimeout);
        }
        
        // 开始倒计时
        timeLeft = 5;
        timerEl.textContent = timeLeft;
        
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        timerInterval = setInterval(function() {
            timeLeft--;
            timerEl.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                checkAnswer();
            }
        }, 1000);
    }
    
    // 检查答案
    function checkAnswer() {
        clearInterval(timerInterval);
        if (checkAnswerTimeout) {
            clearTimeout(checkAnswerTimeout);
        }
        isAnswering = false;
        
        let currentQuestion = questions[currentQuestionIndex];
        let isCorrect = false;
        
        // 检查当前灯光状态是否符合答案要求
        switch(currentQuestion.answer) {
            case "lowBeam":
                isCorrect = currentLightState.lowBeam && !currentLightState.highBeam;
                break;
            case "highBeam":
                isCorrect = currentLightState.highBeam && !currentLightState.lowBeam;
                break;
            case "alternate3":
                isCorrect = alternateCount >= 6;  // 确保完成至少3次交替
                break;
            case "widthLightOnly":
                isCorrect = currentLightState.widthLight && !currentLightState.lowBeam && !currentLightState.highBeam;
                break;
        }
        
        // 显示正确答案
        correctAnswerEl.textContent = `正确答案: ${getAnswerText(currentQuestion.answer)}`;
        
        if (isCorrect) {
            resultEl.textContent = "✓ 正确";
            resultEl.className = "result correct";
            correctCount++;
            correctCountEl.textContent = correctCount;
        } else {
            resultEl.textContent = "✗ 错误";
            resultEl.className = "result wrong";
            wrongCount++;
            wrongCountEl.textContent = wrongCount;
            totalScore -= 10;
            totalScoreEl.textContent = totalScore;
            
            // 添加到错题记录
            addWrongQuestion(currentQuestion);
        }
        
        currentQuestion.answered = true;
        currentQuestionIndex++;
        
        setTimeout(function() {
            nextQuestion();
        }, 2000);
    }
    
    // 结束答题
    function endQuiz() {
        statusEl.textContent = "考试结束";
        questionEl.textContent = `最终得分: ${totalScore}`;
        timerEl.textContent = "";
        correctAnswerEl.textContent = "";
        turnOffAllLights();
        
        // 添加训练记录
        addHistoryRecord(totalScore);
        
        startBtn.textContent = "重新开始";
    }
    
    // 事件监听
    lowBeamBtn.addEventListener('click', function() {
        if (currentLightState.lowBeam) {
            // 如果已经开启，则关闭
            leftLight.classList.remove('low-beam-on');
            rightLight.classList.remove('low-beam-on');
            currentLightState.lowBeam = false;
        } else {
            // 如果未开启，则开启
            turnOnLowBeam();
        }
    });
    
    highBeamBtn.addEventListener('click', function() {
        if (currentLightState.highBeam) {
            // 如果已经开启，则关闭
            leftLight.classList.remove('high-beam-on');
            rightLight.classList.remove('high-beam-on');
            currentLightState.highBeam = false;
        } else {
            // 如果未开启，则开启
            turnOnHighBeam();
        }
    });
    
    alternateBtn.addEventListener('click', function() {
        alternateBeams();
    });
    
    widthLightBtn.addEventListener('click', function() {
        if (currentLightState.widthLight) {
            // 如果已经开启，则关闭
            leftWidthLight.classList.remove('on');
            rightWidthLight.classList.remove('on');
            currentLightState.widthLight = false;
        } else {
            // 如果未开启，则开启
            turnOnWidthLight();
        }
    });
    
    turnOffBtn.addEventListener('click', function() {
        turnOffAllLights();
    });
    
    startBtn.addEventListener('click', function() {
        init();
        startBtn.textContent = "考试中...";
        setTimeout(startQuiz, 1000);
        
        // 点击开始后隐藏添加到主屏幕提示
        if (addToHomeTip.style.display === 'block') {
            addToHomeTip.style.display = 'none';
        }
    });
    
    // 标签切换事件
    wrongQuestionsTab.addEventListener('click', function() {
        wrongQuestionsTab.classList.add('active');
        historyRecordsTab.classList.remove('active');
        wrongQuestionsPanel.classList.add('active');
        historyRecordsPanel.classList.remove('active');
    });
    
    historyRecordsTab.addEventListener('click', function() {
        historyRecordsTab.classList.add('active');
        wrongQuestionsTab.classList.remove('active');
        historyRecordsPanel.classList.add('active');
        wrongQuestionsPanel.classList.remove('active');
    });
    
    // 初始化页面
    init();
    
    // 加载本地存储的数据
    loadLocalData();
    
    // 检测iOS设备并显示添加到主屏幕提示
    detectiOS();
    
    // 移动设备优化
    enableTouchOptimization();
}); 