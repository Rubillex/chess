let drawState = true;

$('#draw').on('click', () => {
    const pgn = game.pgn({newline: '_'});
    makePostRequest({ id: gameId, drawState: drawState, pgn: pgn }, '/game/draw');
    drawState = !drawState;
    document.getElementById('draw').innerHTML = drawState ? 'Предложить ничью' : 'Отменить предложение';
});