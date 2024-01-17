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
let game = new Chess();
let whiteSquareGrey = '#a9a9a9';
let blackSquareGrey = '#696969';

let config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onMouseoutSquare: onMouseoutSquare,
    onMouseoverSquare: onMouseoverSquare,
    onSnapEnd: onSnapEnd
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

function removeGreySquares() {
    $('#myBoard .square-55d63').css('background', '')
}

function greySquare(square) {
    let $square = $('#myBoard .square-' + square);

    let background = whiteSquareGrey;
    if ($square.hasClass('black-3c85d')) {
        background = blackSquareGrey
    }

    $square.css('background', background)
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

    oldFen = game.fen();
}

function onDrop(source, target) {
    removeGreySquares();

    // see if the move is legal
    let move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) return 'snapback'
}

function onMouseoverSquare(square, piece) {
    if (currentGameState != GAME_STATES.playing) {
        return false;
    }
    // if role is not that side's turn
    if (game.turn() !== role) {
        return false;
    }
    // get list of possible moves for this square
    let moves = game.moves({
        square: square,
        verbose: true
    });

    // exit if there are no moves available for this square
    if (moves.length === 0) return;

    // highlight the square they moused over
    greySquare(square);

    // highlight the possible squares for this piece
    for (let i = 0; i < moves.length; i++) {
        greySquare(moves[i].to)
    }
}

function onMouseoutSquare(square, piece) {
    removeGreySquares()
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
        }
    }
}