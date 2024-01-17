
const channelName = 'channel-' + gameId;

let pusher = new Pusher("b8c31f3f9dcdaf9b10f0", {
    cluster: "eu",
});

let channel = pusher.subscribe(channelName);


/** Каналы пушера */
channel.bind_global((data) => {
    console.log('global', data);
});

channel.bind('change-draw-status', function (data) {
    console.log('change-draw-status', data);
    document.getElementById('drawMessage').innerHTML = data.readyState ? 'Второй игрок предложил ничью' : '';
});

// Смена статусов
channel.bind('change-ready-status', function (data) {
    console.log('change-ready-status', data);
    if (data.userId !== userId) {
        if (role == ROLE_WHITE) {
            secondReady = data.readyState;
        }
        if (role == ROLE_BLACK) {
            firstReady = data.readyState;
        }
    } else {
        if (role == ROLE_WHITE) {
            firstReady = data.readyState;
        }
        if (role == ROLE_BLACK) {
            secondReady = data.readyState;
        }
    }
    document.getElementById('firstReady').innerHTML = firstReady ? 'Готов' : 'Не готов';
    document.getElementById('secondReady').innerHTML = secondReady ? 'Готов' : 'Не готов';
});

channel.bind('game-start', function (data) {
    console.log('game-start', data);
    currentGameState = GAME_STATES.playing;
    document.getElementById('firstReady').style.display = 'none';
    document.getElementById('secondReady').style.display = 'none';
    clearFirstTimer();
    clearSecondTimer();

    if (game.turn() == ROLE_WHITE) {
        firstTimer = setInterval(
            () => {
                firstTimerValue -= 1000;
                timerFirst.innerHTML = millisToMinutesAndSeconds(firstTimerValue);

                if (firstTimerValue <= 0) {
                    clearInterval(firstTimer);
                }

                if (firstTimerValue <= 0 && role !== ROLE_WHITE) {
                    const pgn = game.pgn({newline: '_'});
                    makePostRequest({ id: gameId, isDraw: game.in_draw(), isCheckmate: game.in_checkmate(), pgn: pgn }, '/game/finish');
                }
            },
            1000
        );
    } else {
        secondTimer = setInterval(
            () => {
                secondTimerValue -= 1000;
                timerSecond.innerHTML = millisToMinutesAndSeconds(secondTimerValue);

                if (secondTimerValue <= 0) {
                    clearInterval(secondTimer);
                }

                if (firstTimerValue <= 0 && role !== ROLE_BLACK) {
                    const pgn = game.pgn({newline: '_'});
                    makePostRequest({ id: gameId, isDraw: game.in_draw(), isCheckmate: game.in_checkmate(), pgn: pgn }, '/game/finish');
                }
            },
            1000
        );
    }
});

channel.bind("make-move", (data) => {
    console.log('make-move', data);
    firstTimerValue = data.firstPlayerTimeLeft;
    secondTimerValue = data.secondPlayerTimeLeft;
    timerFirst.innerHTML = millisToMinutesAndSeconds(firstTimerValue);
    timerSecond.innerHTML = millisToMinutesAndSeconds(secondTimerValue);

    clearFirstTimer();
    clearSecondTimer();

    game.load(data.fen);
    board.position(data.fen);

    if (game.turn() == ROLE_WHITE) {
        firstTimer = setInterval(
            () => {
                firstTimerValue -= 1000;
                timerFirst.innerHTML = millisToMinutesAndSeconds(firstTimerValue);
            },
            1000
        );
    } else {
        secondTimer = setInterval(
            () => {
                secondTimerValue -= 1000;
                timerSecond.innerHTML = millisToMinutesAndSeconds(secondTimerValue);
            },
            1000
        );
    }
});

channel.bind('finish-game', function (data) {
    console.log('finish-game', data);
    currentGameState = GAME_STATES.finished;
    clearFirstTimer();
    clearSecondTimer();
});
