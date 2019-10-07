(function() {

var context;
window.addEventListener('load', init, false);
function init() {
  try {
    
    // Fix up prefixing
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext();
  }
  catch(e) {
    alert('Web Audio API is not supported in this browser');
  }

  var skipSoundsBuffer = null;
  function loadDogSound(url) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    // Decode asynchronously
    request.onload = function() {
      context.decodeAudioData(request.response, function(buffer) {
        skipSoundsBuffer = buffer;
        console.log(skipSoundsBuffer);
      }, function(e){
        console.log(e);
      });
    }
    request.send();
  }

  // loadDogSound('sample1.mp3')
}

audio_file.onchange = function() {
  var file = this.files[0];
  var reader = new FileReader();
  var context = new(window.AudioContext || window.webkitAudioContext)();
  reader.onload = function() {
    context.decodeAudioData(reader.result, function(buffer) {
      prepare(buffer);
    });
  };
  reader.readAsArrayBuffer(file);
};

function prepare(buffer) {
  console.log(buffer);
  console.log(buffer.sampleRate);
  // var offlineContext = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
  // var source = offlineContext.createBufferSource();
  // source.buffer = buffer;
  // var filter = offlineContext.createBiquadFilter();
  // filter.type = "lowpass";
  // source.connect(filter);
  // filter.connect(offlineContext.destination);
  // source.start(6);
  // offlineContext.startRendering();
  // offlineContext.oncomplete = function(e) {
  //   process(e);
  // };

  process(buffer);
}

/////////////////////////////////////////
// **************************************
// New code
// **************************************
/////////////////////////////////////////

var minVal = Infinity;
var maxVal = 0;
var runningMean = null;
var skipSamples = 0;
var samplesProcessed = 0;
function processPart1(data, len) {
  
  if ( true ) {
    console.log(data.slice(100000));
    for(var i = 0; i < 2048; i++) {
      samplesProcessed++;
      // console.log("Test");
      if ( samplesProcessed == 100000 ) {
        console.log("Hello")
      }
      var v = data[i] / 128.0;
      // var y = v * HEIGHT/2;

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

      // if ( skipSamples > 0 ) {
      //   skipSamples--;
      //   continue;
      // }

      if ( true || samplesProcessed % 44000 == 0 ) {
        // console.log("minVal", minVal);
        // console.log("maxVal", maxVal);
        // console.log("runningMean", runningMean);
        // console.log("v", v);
      }

      if ( samplesProcessed > 44000 * 2 && v > 1.2 * runningMean ) {
        skipSamples = 10000; // Approx 1 sec
        console.log("Beat");
      }
    }
  }

}



function process(e) {
  var filteredBuffer = e;//.renderedBuffer;
  //If you want to analyze both channels, use the other channel later
  var data = e.getChannelData(0);
  var max = arrayMax(data);
  var min = arrayMin(data);
  console.log("max", max);
  console.log("min", min);
  var threshold = min + (max - min) * 0.6;
  console.log("threshold", threshold);
  var peaks = getPeaksAtThreshold(data, threshold);

  processPart1(data, data.length);
  // console.log(peaks);
  // var intervalCounts = countIntervalsBetweenNearbyPeaks(peaks);
  // console.log(intervalCounts);
  // var tempoCounts = groupNeighborsByTempo(intervalCounts);
  // tempoCounts.sort(function(a, b) {
  //   return b.count - a.count;
  // });
  // if (tempoCounts.length) {
  //   output.innerHTML = tempoCounts[0].tempo;
  // }
  output.innerHTML = "Error";
  if ( peaks.length ) {
    output.innerHTML = peaks.length;
  }
}

// http://tech.beatport.com/2014/web-audio/beat-detection-using-web-audio/
function getPeaksAtThreshold(data, threshold) {
  var peaksArray = [];
  var length = data.length;
  for (var i = 0; i < length;) {
    if (data[i] > threshold) {
      peaksArray.push(i);
      // Skip forward ~ 1/4s to get past this peak.
      i += 12000;
    }
    i++;
  }
  return peaksArray;
}

function countIntervalsBetweenNearbyPeaks(peaks) {
  var intervalCounts = [];
  peaks.forEach(function(peak, index) {
    for (var i = 0; i < 10; i++) {
      var interval = peaks[index + i] - peak;
      var foundInterval = intervalCounts.some(function(intervalCount) {
        if (intervalCount.interval === interval) return intervalCount.count++;
      });
      //Additional checks to avoid infinite loops in later processing
      if (!isNaN(interval) && interval !== 0 && !foundInterval) {
        intervalCounts.push({
          interval: interval,
          count: 1
        });
      }
    }
  });
  return intervalCounts;
}

function groupNeighborsByTempo(intervalCounts) {
  var tempoCounts = [];
  intervalCounts.forEach(function(intervalCount) {
    //Convert an interval to tempo
    var theoreticalTempo = 60 / (intervalCount.interval / 44100);
    theoreticalTempo = Math.round(theoreticalTempo);
    if (theoreticalTempo === 0) {
      return;
    }
    // Adjust the tempo to fit within the 90-180 BPM range
    while (theoreticalTempo < 90) theoreticalTempo *= 2;
    while (theoreticalTempo > 180) theoreticalTempo /= 2;

    var foundTempo = tempoCounts.some(function(tempoCount) {
      if (tempoCount.tempo === theoreticalTempo) return tempoCount.count += intervalCount.count;
    });
    if (!foundTempo) {
      tempoCounts.push({
        tempo: theoreticalTempo,
        count: intervalCount.count
      });
    }
  });
  return tempoCounts;
}

// http://stackoverflow.com/questions/1669190/javascript-min-max-array-values
function arrayMin(arr) {
  var len = arr.length,
    min = Infinity;
  while (len--) {
    if (arr[len] < min) {
      min = arr[len];
    }
  }
  return min;
}

function arrayMax(arr) {
  var len = arr.length,
    max = -Infinity;
  while (len--) {
    if (arr[len] > max) {
      max = arr[len];
    }
  }
  return max;
}

})();