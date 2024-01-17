let firstReady = false;
let secondReady = false;

$('#ready').on('click', async function () {
    if (role === ROLE_WHITE) {
        await makePostRequest({id: gameId, readyState: !firstReady}, '/game/start');
    }
    if (role === ROLE_BLACK) {
        await makePostRequest({id: gameId, readyState: !secondReady}, '/game/start');
    }
});