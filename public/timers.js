timerFirst = document.getElementById('timerFirst');
timerSecond = document.getElementById('timerSecond');

let firstTimerValue = 1800000;
let secondTimerValue = 1800000;

timerFirst.innerHTML = millisToMinutesAndSeconds(firstTimerValue);
timerSecond.innerHTML = millisToMinutesAndSeconds(secondTimerValue);

let firstTimer;
let secondTimer;

function clearFirstTimer() {
    clearInterval(firstTimer);
}

function clearSecondTimer() {
    clearInterval(secondTimer);
}

function millisToMinutesAndSeconds(millis) {
    var minutes = Math.floor(millis / 60000);
    var seconds = ((millis % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}