(function(){

// set up basic variables for app
var record = document.querySelector('.record');
var stop = document.querySelector('.stop');
var soundClips = document.querySelector('.sound-clips');
var canvas = document.querySelector('.visualizer');
var mainSection = document.querySelector('.main-controls');


// disable stop button while not recording
stop.disabled = true;

// visualiser setup - create web audio api context and canvas
var audioCtx;
var canvasCtx = canvas.getContext("2d");

var recording = false;

//main block for doing the audio recording

if (navigator.mediaDevices.getUserMedia) {
  console.log('getUserMedia supported.');
}

record.onclick = function() {

  audioCtx = new (window.AudioContext || webkitAudioContext)();

  navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);

  recording = true;
  // mediaRecorder.start();
  // console.log(mediaRecorder.state);
  // console.log("recorder started");
  record.style.background = "red";

  stop.disabled = false;
  record.disabled = true;
}

stop.onclick = function() {
  recording = false;
  // mediaRecorder.stop();
  // console.log(mediaRecorder.state);
  // console.log("recorder stopped");
  record.style.background = "";
  record.style.color = "";
  // mediaRecorder.requestData();

  stop.disabled = true;
  record.disabled = false;
}

if (navigator.mediaDevices.getUserMedia) {
  console.log('getUserMedia supported.');

  var constraints = { audio: true };
  var chunks = [];

  var onSuccess = function(stream) {
    // var mediaRecorder = new MediaRecorder(stream);

    visualizer(stream);

    

    // mediaRecorder.onstop = function(e) {
    //   console.log(beats);
    // }

    // mediaRecorder.ondataavailable = function(e) {
    //   chunks.push(e.data);
    // }
  }

  var onError = function(err) {
    console.log('The following error occured: ' + err);
  }

} else {
   console.log('getUserMedia not supported on your browser!');
}

/////////////////////////////////////////
// **************************************
// New code
// **************************************
/////////////////////////////////////////

var totalJumps = 0;

var minVal = Infinity;
var maxVal = 0;
var runningMean = null;
var skipSamples = 0;
var samplesProcessed = 0;
var lasSkipSample = null;

var scale = 1000;
var lastSamples = [];

function processPart(data, len) {
}

function processBeat(v) {
  if ( recording ) {
    samplesProcessed++;
    // var v = data;

    if ( v < minVal ) {
      minVal = v;
    }

    if ( v > maxVal ) {
      maxVal = v;
    }

    if ( runningMean === null ) {
      runningMean = v;
    }
    else {
      var factionProcessed = 1/samplesProcessed;
      runningMean = runningMean * (1.0-factionProcessed) + v * factionProcessed
    }

    if ( skipSamples > 0 ) {
      skipSamples--;
      if ( skipSamples == 0 ) {
        lasSkipSample = v;
        minVal = Infinity;
        maxVal = 0;
      }
      return;
    }

    if ( samplesProcessed % 100 == 0 ) {
      // console.log("minVal", minVal);
      // console.log("maxVal", maxVal);
      // console.log("runningMean", runningMean);
      // console.log("v", v);
    }

    // var highThreshold = runningMean + (1 - runningMean)
    var highThreshold = runningMean * 5;
    // console.log(runningMean);

    if ( samplesProcessed > 10 * 2 && v > highThreshold && minVal < runningMean * 0.98 ) {
      // skipSamples = 44 / (3); // Approx 1 sec
      skipSamples = 15;
      console.log("Beat");
      totalJumps += 1;

      total_skips.innerText = totalJumps;
      return true;
    }
  }
}

function getRMS(data) {
  var total = data.reduce(function(t, v) {
    var x = (v - 128.0) / 128.0;
    return t + (x * x);
  }, 0);
  return total / data.length;
}

//***************************************

var beats = 0;
var intensities = [];

function visualizer(stream) {
  var source = audioCtx.createMediaStreamSource(stream);

  var analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  var bufferLength = analyser.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);
  //analyser.connect(audioCtx.destination);

  draw()

  canvasCtx.globalAlpha = 1;

  function draw() {
    WIDTH = canvas.width
    HEIGHT = canvas.height;

    beats++;

    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    // processPart(dataArray, bufferLength);

    var intensity = getRMS(dataArray);
    intensities.push(intensity);

    var isSkip = processBeat(intensity);

    // canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    // canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    canvasCtx.lineWidth = 2;
    var y = intensity * HEIGHT;
    if ( isSkip ) {
      canvasCtx.strokeStyle = 'rgb(255, 0, 0)';
      y = HEIGHT;
    }
    else {
      canvasCtx.strokeStyle = 'rgb(100, 100, 100)';
    }

    canvasCtx.beginPath();

    canvasCtx.moveTo(beats, 0);

    if( intensity > 1 ) console.log(intensity);

    canvasCtx.lineTo(beats, y);
    canvasCtx.stroke();

    // var sliceWidth = WIDTH * 1.0 / bufferLength;
    // var x = 0;

    // for(var i = 0; i < bufferLength; i++) {
 
    //   var v = dataArray[i] / 128.0;
    //   var y = v * HEIGHT/2;

    //   if(i === 0) {
    //     canvasCtx.moveTo(x, y);
    //   } else {
    //     canvasCtx.lineTo(x, y);
    //   }

    //   x += sliceWidth;
    // }

    // canvasCtx.lineTo(canvas.width, canvas.height/2);
    // canvasCtx.stroke();
  }
}

window.onresize = function() {
  canvas.width = mainSection.offsetWidth;
}

window.onresize();

})();