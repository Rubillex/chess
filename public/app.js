/** КОНСТАНТЫ */
const ROLE_BLACK = 'b';
const ROLE_WHITE = 'w';
const ROLE_NONE = 'n';
const BASE_URL = 'https://chess.kremigel.ru/api';

const GAME_STATES = {
    waiting: 1,
    playing: 2,
    finished: 3,
};

let currentGameState = 1;

/** Входные переменные */

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const gameId = parseInt(urlParams.get('game_id')) ?? 0;
let userId = 0;

let role = urlParams.get('role');

let token = '';

if (role == ROLE_WHITE) {
    token = 'h60HeSAB28EpHDtdHb9bfxMRhR3SB8DE';
    userId = 12;
}

if (role == ROLE_BLACK) {
    token = 'h60HeSAB28EpHDtdHb9bfxMRhR3SB8DR';
    userId = 13;
}

let board = null;
let $board = $('#myBoard');
let game = new Chess();
let squareToHighlight = null;
let squareClass = 'square-55d63';

let config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    onMoveEnd: onMoveEnd,
    onDragMove: onDragMove,
};

board = Chessboard('myBoard', config);

let oldFen = '';

if (role === ROLE_BLACK) {
    board.flip();
}

/** Запрос на получение состояния игры */
getState();


/** Запрос на завершение игры */

/** Логика игры */
function removeHighlights (color) {
    $board.find('.' + squareClass)
        .removeClass('highlight-' + color)
}

function onMoveEnd () {
    const highlightColor = game.turn() === ROLE_BLACK ? 'white' : 'black';
    $board.find('.square-' + squareToHighlight)
        .addClass('highlight-' + highlightColor)
}


function onDragStart(source, piece) {
    if (currentGameState != GAME_STATES.playing) {
        return false;
    }
    // do not pick up pieces if the game is over
    if (game.game_over()) {
        return false;
    }

    // if role is not that side's turn
    if (game.turn() !== role) {
        return false;
    }
    // or if it's not that side's turn
    if ((game.turn() === ROLE_WHITE && piece.search(/^b/) !== -1) ||
        (game.turn() === ROLE_BLACK && piece.search(/^w/) !== -1)) {
        return false
    }

    const highlightColor = game.turn() === ROLE_WHITE ? 'white' : 'black';
    removeHighlights(highlightColor);
    $board.find('.square-' + source).addClass('highlight-' + highlightColor);

    oldFen = game.fen();
}

function onDragMove (newLocation, oldLocation, source,
                     piece, position, orientation) {
    const highlightColor = game.turn() === ROLE_WHITE ? 'white' : 'black';
    removeHighlights(highlightColor);
    removeHighlights(game.turn() === ROLE_WHITE ? 'black' : 'white');
    $board.find('.square-' + source).addClass('highlight-' + highlightColor);
    $board.find('.square-' + newLocation).addClass('highlight-' + highlightColor);
}

function isPromoting(fen, move) {
    const chess = new Chess(fen);

    const piece = chess.get(move.from);

    if (piece?.type !== "p") {
        return false;
    }

    if (piece.color !== chess.turn()) {
        return false;
    }

    if (!["1", "8"].some((it) => move.to.endsWith(it))) {
        return false;
    }

    return chess
        .moves({ square: move.from, verbose: true })
        .map((it) => it.to)
        .includes(move.to);
}

let sourceTemp = null;
let targetTemp = null;

function onDrop(source, target) {

    // see if the move is legal
    if (isPromoting(game.fen(), { from: source, to: target })) {
        sourceTemp = source;
        targetTemp = target;
        $('#promotionModal').modal('show');
        const qButton = document.getElementById('qButton');
        const rButton = document.getElementById('rButton');

        rButton.addEventListener('click', () => {
            promote('r');
        });

        qButton.addEventListener('click', () => {
            promote('q');
        });
        return;
    };

    let move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) return 'snapback';

    // highlight white's move
    const highlightColor = game.turn() === ROLE_BLACK ? 'white' : 'black';
    removeHighlights(highlightColor);
    $board.find('.square-' + source).addClass('highlight-' + highlightColor);
    $board.find('.square-' + target).addClass('highlight-' + highlightColor);
    squareToHighlight = move.to;
}

function promote(type) {
    $('#promotionModal').modal('hide');
    console.log(type);
    let move = game.move({
        from: sourceTemp,
        to: targetTemp,
        promotion: type // NOTE: always promote to a queen for example simplicity
    });

    console.log(move);

    // illegal move
    if (move === null) return 'snapback';

    // highlight white's move
    const highlightColor = game.turn() === ROLE_BLACK ? 'white' : 'black';
    removeHighlights(highlightColor);
    $board.find('.square-' + sourceTemp).addClass('highlight-' + highlightColor);
    $board.find('.square-' + targetTemp).addClass('highlight-' + highlightColor);
    squareToHighlight = move.to;
    board.position(game.fen());
}

function onSnapEnd() {
    board.position(game.fen());

    makePostRequest({id: gameId, fen: game.fen()}, '/game/make-move');

    if (game.game_over()) {
        const pgn = game.pgn({newline: '_'});
        makePostRequest({ id: gameId, isDraw: game.in_draw(), isCheckmate: game.in_checkmate(), pgn: pgn }, '/game/finish');
    }
}

function makePostRequest(data, url) {
    return fetch(BASE_URL + url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
        }
    });
}

async function getState() {
    let currentTimeInMillis = new Date().getTime();
    const res = await makePostRequest({id: gameId}, '/game/state');
    if (res.ok) {
        let gameState = await res.json();
        currentGameState = gameState.data.status;
        if (gameState && gameState.data && gameState.data.gameStates.length > 0) {

            gameState.data.gameStates.forEach((i) => {
                game.load(i.fen);
            });

            let lastElement = gameState.data.gameStates.pop();

            timerFirst.innerHTML = millisToMinutesAndSeconds(lastElement.firstPlayerTimeLeft);
            timerSecond.innerHTML = millisToMinutesAndSeconds(lastElement.secondPlayerTimeLeft);

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

            board.position(lastElement.fen);
            const highlightColor = game.turn() === ROLE_BLACK ? 'white' : 'black';
            removeHighlights(highlightColor);

            const history = game.history();

            if (history.length >= 2) {
                const last2 = history.slice(-2);
                removeHighlights(game.turn() === ROLE_WHITE ? 'black' : 'white');
                $board.find('.square-' + last2[0]).addClass('highlight-' + highlightColor);
                $board.find('.square-' + last2[1]).addClass('highlight-' + highlightColor);
            }
        }
    }
}