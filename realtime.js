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

var audioCtx = new (window.AudioContext || webkitAudioContext)();
var canvasCtx = canvas.getContext("2d");

var recording = false;

//main block for doing the audio recording

if (navigator.mediaDevices.getUserMedia) {
  console.log('getUserMedia supported.');

  var constraints = { audio: true };
  var chunks = [];

  var onSuccess = function(stream) {
    var mediaRecorder = new MediaRecorder(stream);

    visualize(stream);

    record.onclick = function() {
      recording = true;
      mediaRecorder.start();
      console.log(mediaRecorder.state);
      console.log("recorder started");
      record.style.background = "red";

      stop.disabled = false;
      record.disabled = true;
    }

    stop.onclick = function() {
      recording = false;
      mediaRecorder.stop();
      console.log(mediaRecorder.state);
      console.log("recorder stopped");
      record.style.background = "";
      record.style.color = "";
      // mediaRecorder.requestData();

      stop.disabled = true;
      record.disabled = false;
    }

    mediaRecorder.onstop = function(e) {
      console.log("data available after MediaRecorder.stop() called.");

      var clipName = prompt('Enter a name for your sound clip?','My unnamed clip');
      console.log(clipName);
      var clipContainer = document.createElement('article');
      var clipLabel = document.createElement('p');
      var audio = document.createElement('audio');
      var deleteButton = document.createElement('button');
     
      clipContainer.classList.add('clip');
      audio.setAttribute('controls', '');
      deleteButton.textContent = 'Delete';
      deleteButton.className = 'delete';

      if(clipName === null) {
        clipLabel.textContent = 'My unnamed clip';
      } else {
        clipLabel.textContent = clipName;
      }

      clipContainer.appendChild(audio);
      clipContainer.appendChild(clipLabel);
      clipContainer.appendChild(deleteButton);
      soundClips.appendChild(clipContainer);

      audio.controls = true;
      var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
      chunks = [];
      var audioURL = window.URL.createObjectURL(blob);
      audio.src = audioURL;
      console.log("recorder stopped");

      deleteButton.onclick = function(e) {
        evtTgt = e.target;
        evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
      }

      clipLabel.onclick = function() {
        var existingName = clipLabel.textContent;
        var newClipName = prompt('Enter a new name for your sound clip?');
        if(newClipName === null) {
          clipLabel.textContent = existingName;
        } else {
          clipLabel.textContent = newClipName;
        }
      }
    }

    mediaRecorder.ondataavailable = function(e) {
      chunks.push(e.data);
      // console.log(e.data);
    }
  }

  var onError = function(err) {
    console.log('The following error occured: ' + err);
  }

  navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);

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
  
  if ( recording ) {
    // console.log(data);
    for(var i = 0; i < len; i++) {

      samplesProcessed++;
      var s = data[i] / 128.0;
      lastSamples.push(s);
      // var y = v * HEIGHT/2;

      if ( samplesProcessed  % scale == 1 ) {
        var v = lastSamples.reduce((a, b) => a + b, 0) / lastSamples.length;
        lastSamples = [];
      }
      else {
        continue;
      }

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
        continue;
      }

      if ( samplesProcessed % 44000 == 0 ) {
        // console.log("minVal", minVal);
        // console.log("maxVal", maxVal);
        // console.log("runningMean", runningMean);
        // console.log("v", v);
      }

      if ( samplesProcessed > 44000 * 2 && v > 1.2 * runningMean && minVal < runningMean * 0.98 ) {
        // skipSamples = 44 / (3); // Approx 1 sec
        skipSamples = 0;
        console.log("Beat");
        totalJumps += 1;

        total_skips.innerText = totalJumps;
      }
    }
  }

}

function process(data) {
  
}

function processStream(stream) {
  var source = audioCtx.createMediaStreamSource(stream);

  var analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  var bufferLength = analyser.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);

  process();

  function process() {

    analyser.getByteTimeDomainData(dataArray);

    process(dataArray);

    setTimeout(function(){
      process();
    }, 5);
  }
}

//***************************************

function visualize(stream) {
  var source = audioCtx.createMediaStreamSource(stream);

  var analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  var bufferLength = analyser.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);
  //analyser.connect(audioCtx.destination);

  draw()

  function draw() {
    WIDTH = canvas.width
    HEIGHT = canvas.height;

    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    processPart(dataArray, bufferLength);

    canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

    canvasCtx.beginPath();

    var sliceWidth = WIDTH * 1.0 / bufferLength;
    var x = 0;


    for(var i = 0; i < bufferLength; i++) {
 
      var v = dataArray[i] / 128.0;
      var y = v * HEIGHT/2;

      if(i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height/2);
    canvasCtx.stroke();

  }
}

window.onresize = function() {
  canvas.width = mainSection.offsetWidth;
}

window.onresize();

})();