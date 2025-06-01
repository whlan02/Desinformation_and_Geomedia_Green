import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import { useRef, useState, useEffect } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { saveImageToGallery } from '../utils/galleryStorage';

const steganographyLib = `
/*
 * steganography.js v1.0.3 2017-09-22
 *
 * Copyright (C) 2012 Peter Eigenschink (http://www.peter-eigenschink.at/)
 * Dual-licensed under MIT and Beerware license.
*/
;(function (name, context, factory) {

  // Supports UMD. AMD, CommonJS/Node.js and browser context
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    define(factory);
  } else {
    context[name] = factory();
  }

})("steg", this, function () {
var Cover = function Cover() {};
var util = {
  "isPrime" : function(n) {
    if (isNaN(n) || !isFinite(n) || n%1 || n<2) return false;
    if (n%2===0) return (n===2);
    if (n%3===0) return (n===3);
    var m=Math.sqrt(n);
    for (var i=5;i<=m;i+=6) {
      if (n%i===0) return false;
      if (n%(i+2)===0) return false;
    }
    return true;
  },
  "findNextPrime" : function(n) {
    for(var i=n; true; i+=1)
      if(util.isPrime(i)) return i;
  },
  "sum" : function(func, end, options) {
    var sum = 0;
    options = options || {};
    for(var i = options.start || 0; i < end; i+=(options.inc||1))
      sum += func(i) || 0;

    return (sum === 0 && options.defValue ? options.defValue : sum);
  },
  "product" : function(func, end, options) {
    var prod = 1;
    options = options || {};
    for(var i = options.start || 0; i < end; i+=(options.inc||1))
      prod *= func(i) || 1;

    return (prod === 1 && options.defValue ? options.defValue : prod);
  },
  "createArrayFromArgs" : function(args,index,threshold) {
    var ret = new Array(threshold-1);
    for(var i = 0; i < threshold; i+=1)
      ret[i] = args(i >= index ? i+1:i);

    return ret;
  },
  "loadImg": function(url) {
    var image = new Image();
    image.src = url;
    return image;
  }
};

Cover.prototype.config = {
  "t": 3,
  "threshold": 1,
  "codeUnitSize": 16,
  "args": function(i) { return i+1; },
  "messageDelimiter": function(modMessage,threshold) {
            var delimiter = new Array(threshold*3);
            for(var i = 0; i < delimiter.length; i+=1)
              delimiter[i] = 255;
            
            return delimiter;
          },
  "messageCompleted": function(data, i, threshold) {
            var done = true;
            for(var j = 0; j < 16 && done; j+=1) {
              done = done && (data[i+j*4] === 255);
            }
            return done;
          }
};
Cover.prototype.getHidingCapacity = function(image, options) {
  options = options || {};
  var config = this.config;

  var width = options.width || image.width,
    height = options.height || image.height,
    t = options.t || config.t,
    codeUnitSize = options.codeUnitSize || config.codeUnitSize;
  return t*width*height/codeUnitSize >> 0;
};
Cover.prototype.encode = function(message, image, options) {
  // Handle image url
  if(typeof image === 'string' && image.length) { // check if image is a string
    image = util.loadImg(image);
  } else if(image.src) {
    image = util.loadImg(image.src);
  } else if(!(image instanceof HTMLImageElement)) {
    throw new Error('IllegalInput: The input image is neither an URL string nor an image instance.');
  }

  options = options || {};
  var config = this.config;

  var t = options.t || config.t,
    threshold = options.threshold || config.threshold,
    codeUnitSize = options.codeUnitSize || config.codeUnitSize,
    prime = util.findNextPrime(Math.pow(2,t)),
    args = options.args || config.args,
    messageDelimiter = options.messageDelimiter || config.messageDelimiter;

  if(!t || t < 1 || t > 7) throw new Error('IllegalOptions: Parameter t = ' + t + ' is not valid: 0 < t < 8');

  var shadowCanvas = document.createElement('canvas'),
    shadowCtx = shadowCanvas.getContext('2d');

  shadowCanvas.style.display = 'none';
  shadowCanvas.width = options.width || image.naturalWidth || image.width; // Use naturalWidth
  shadowCanvas.height = options.height || image.naturalHeight || image.height; // Use naturalHeight
  
  if(options.height && options.width) {
    shadowCtx.drawImage(image, 0, 0, options.width, options.height );
  } else {
    shadowCtx.drawImage(image, 0, 0, shadowCanvas.width, shadowCanvas.height);
  }

  var imageData = shadowCtx.getImageData(0, 0, shadowCanvas.width, shadowCanvas.height),
    data = imageData.data;

  var bundlesPerChar = codeUnitSize/t >> 0,
    overlapping = codeUnitSize%t,
    modMessage = [],
    decM, oldDec, oldMask, left, right,
    dec, curOverlapping, mask;

  var i, j;
  for(i=0; i<=message.length; i+=1) {
    dec = message.charCodeAt(i) || 0;
    curOverlapping = (overlapping*i)%t;
    if(curOverlapping > 0 && oldDec) {
      mask = Math.pow(2,t-curOverlapping) - 1;
      oldMask = Math.pow(2, codeUnitSize) * (1 - Math.pow(2, -curOverlapping));
      left = (dec & mask) << curOverlapping;
      right = (oldDec & oldMask) >> (codeUnitSize - curOverlapping);
      modMessage.push(left+right);

      if(i<message.length) {
        mask = Math.pow(2,2*t-curOverlapping) * (1 - Math.pow(2, -t));
        for(j=1; j<bundlesPerChar; j+=1) {
          decM = dec & mask;
          modMessage.push(decM >> (((j-1)*t)+(t-curOverlapping)));
          mask <<= t;
        }
        if((overlapping*(i+1))%t === 0) {
          mask = Math.pow(2, codeUnitSize) * (1 - Math.pow(2,-t));
          decM = dec & mask;
          modMessage.push(decM >> (codeUnitSize-t));
        }
        else if(((((overlapping*(i+1))%t) + (t-curOverlapping)) <= t)) {
          decM = dec & mask;
          modMessage.push(decM >> (((bundlesPerChar-1)*t)+(t-curOverlapping)));
        }
      }
    }
    else if(i<message.length) {
      mask = Math.pow(2,t) - 1;
      for(j=0; j<bundlesPerChar; j+=1) {
        decM = dec & mask;
        modMessage.push(decM >> (j*t));
        mask <<= t;
      }
    }
    oldDec = dec;
  }

  var offset, index, subOffset, delimiter = messageDelimiter(modMessage,threshold),
    q, qS;
  for(offset = 0; (offset+threshold)*4 <= data.length && (offset+threshold) <= modMessage.length; offset += threshold) {
    qS=[];
    for(i=0; i<threshold && i+offset < modMessage.length; i+=1) {
      q = 0;
      for(j=offset; j<threshold+offset && j<modMessage.length; j+=1)
        q+=modMessage[j]*Math.pow(args(i),j-offset);
      qS[i] = (255-prime+1)+(q%prime);
    }
    for(i=offset*4; i<(offset+qS.length)*4 && i<data.length; i+=4)
      data[i+3] = qS[(i/4)%threshold];

    subOffset = qS.length;
  }
  for(index = (offset+subOffset); index-(offset+subOffset)<delimiter.length && (offset+delimiter.length)*4<data.length; index+=1)
    data[(index*4)+3]=delimiter[index-(offset+subOffset)];
  for(i=((index+1)*4)+3; i<data.length; i+=4) data[i] = 255;

  imageData.data = data;
  shadowCtx.putImageData(imageData, 0, 0);

  return shadowCanvas.toDataURL();
};

Cover.prototype.decode = function(image, options) {
  if(typeof image === 'string' && image.length) { // check if image is a string
    image = util.loadImg(image);
  } else if(image.src) {
    image = util.loadImg(image.src);
  } else if(!(image instanceof HTMLImageElement)) {
    throw new Error('IllegalInput: The input image is neither an URL string nor an image instance.');
  }

  options = options || {};
  var config = this.config;

  var t = options.t || config.t,
    threshold = options.threshold || config.threshold,
    codeUnitSize = options.codeUnitSize || config.codeUnitSize,
    prime = util.findNextPrime(Math.pow(2, t)),
    args = options.args || config.args,
    messageCompleted = options.messageCompleted || config.messageCompleted;

  if(!t || t < 1 || t > 7) throw new Error('IllegalOptions: Parameter t = ' + t + ' is not valid: 0 < t < 8');

  var shadowCanvas = document.createElement('canvas'),
    shadowCtx = shadowCanvas.getContext('2d');

  shadowCanvas.style.display = 'none';
  shadowCanvas.width = options.width || image.naturalWidth || image.width; // Use naturalWidth
  shadowCanvas.height = options.height || image.naturalHeight || image.height; // Use naturalHeight
  
  if(options.height && options.width) {
    shadowCtx.drawImage(image, 0, 0, options.width, options.height );
  } else {
    shadowCtx.drawImage(image, 0, 0, shadowCanvas.width, shadowCanvas.height);
  }

  var imageData = shadowCtx.getImageData(0, 0, shadowCanvas.width, shadowCanvas.height),
    data = imageData.data,
    modMessage = [],
    q;

  var i, k, done;
  if (threshold === 1) {
    for(i=3, done=false; !done && i<data.length && !done; i+=4) {
      done = messageCompleted(data, i, threshold);
      if(!done) modMessage.push(data[i]-(255-prime+1));
    }
  } else {
    // Simplified, as the original code had a large commented out block for threshold > 1
    console.warn("Decoding for threshold > 1 is not fully implemented in this version of the library copy.");
  }

  var message = "", charCode = 0, bitCount = 0, mask = Math.pow(2, codeUnitSize)-1;
  for(i = 0; i < modMessage.length; i+=1) {
    charCode += modMessage[i] << bitCount;
    bitCount += t;
    if(bitCount >= codeUnitSize) {
      message += String.fromCharCode(charCode & mask);
      bitCount %= codeUnitSize;
      charCode = modMessage[i] >> (t-bitCount);
    }
  }
  if(charCode !== 0) message += String.fromCharCode(charCode & mask);

  return message;
};

return new Cover();
});
`;

export default function CameraScreen() {
  const router = useRouter();
  const [type, setType] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  
  const [webViewHtml, setWebViewHtml] = useState<string | null>(null);
  const [isEncoding, setIsEncoding] = useState(false);
  const [currentEncodedInfo, setCurrentEncodedInfo] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!permission) {
        await requestPermission();
      }
      if (!mediaPermission) {
        await requestMediaPermission();
      }
      if(!locationPermission) {
        await requestLocationPermission();
      }
    })();
  }, []);

  if (!permission || !mediaPermission || !locationPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading camera permissions...</Text>
      </View>
    );
  }

  if (!permission.granted || !mediaPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>We need your permission to show the camera and save photos</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={async () => {
            await requestPermission();
            await requestMediaPermission();
            if (!locationPermission || !locationPermission.granted) {
              await requestLocationPermission();
            }
          }}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraType = () => {
    setType(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(current => {
      switch (current) {
        case 'off': return 'on';
        case 'on': return 'auto';
        case 'auto': return 'off';
        default: return 'off';
      }
    });
  };

  const takePicture = async () => {
    if (!cameraRef.current || isEncoding) return;

    setIsEncoding(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: true,
      });

      if (!photo.base64) {
        console.error('Failed to get base64 data from photo');
        setIsEncoding(false);
        return;
      }
      
      let locData = null;
      if (locationPermission && locationPermission.granted) {
        const loc = await Location.getCurrentPositionAsync({});
        locData = loc.coords;
      }

      const infoToEncode = JSON.stringify({
        deviceModel: Device.modelName,
        Time: new Date().toLocaleString(),
        location: locData ? { latitude: locData.latitude, longitude: locData.longitude } : null,
      });

      // Store the encoded info for later use in gallery
      setCurrentEncodedInfo(infoToEncode);

      const htmlContent = `
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script>${steganographyLib}</script>
        </head>
        <body>
          <img id="sourceImage" />
          <script>
            const image = document.getElementById('sourceImage');
            const base64Photo = "data:image/jpeg;base64,${photo.base64}";
            const info = '${infoToEncode.replace(/'/g, "\\\\'")}';
            
            image.onload = function() {
              try {
                const encodedDataUrl = steg.encode(info, image);
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'encodedImage', data: encodedDataUrl }));
              } catch (e) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', data: e.toString() + ' Stack: ' + e.stack }));
              }
            };
            image.onerror = function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', data: 'Image failed to load in WebView for encoding.' }));
            };
            image.src = base64Photo;
          </script>
        </body>
        </html>
      `;
      setWebViewHtml(htmlContent);

    } catch (error) {
      console.error('Failed to take picture or prepare for encoding:', error);
      setIsEncoding(false);
    }
  };

  const handleWebViewMessage = async (event: any) => {
    setWebViewHtml(null);
    const messageData = JSON.parse(event.nativeEvent.data);

    if (messageData.type === 'encodedImage') {
      const base64EncodedImage = messageData.data;
      const filename = FileSystem.cacheDirectory + `encoded-${Date.now()}.jpg`;
      try {
        const base64Data = base64EncodedImage.split(',')[1];
        if (!base64Data) {
            throw new Error("Invalid base64 data format from encoding");
        }
        await FileSystem.writeAsStringAsync(filename, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await MediaLibrary.saveToLibraryAsync(filename);
        setLastPhoto(filename);
        
        // Save to gallery storage
        if (currentEncodedInfo) {
          try {
            await saveImageToGallery({
              uri: filename,
              encodedInfo: currentEncodedInfo,
              timestamp: Date.now(),
            });
            console.log('Image saved to gallery storage');
          } catch (galleryError) {
            console.error('Failed to save to gallery storage:', galleryError);
          }
        }
        
        console.log('Encoded image saved to library:', filename);
      } catch (e) {
        console.error('Failed to save encoded image:', e);
        if (lastPhoto) await MediaLibrary.saveToLibraryAsync(lastPhoto); 
      }
    } else if (messageData.type === 'error') {
      console.error('WebView encoding error:', messageData.data);
    }
    setIsEncoding(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={type}
        flash={flash}
      />

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={toggleFlash}>
          <Text style={styles.buttonText}>
            Flash: {flash.charAt(0).toUpperCase() + flash.slice(1)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={takePicture}>
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={toggleCameraType}>
          <Text style={styles.buttonText}>Flip Camera</Text>
        </TouchableOpacity>
      </View>

      {lastPhoto && (
        <View style={styles.preview}>
          <Image
            source={{ uri: lastPhoto }}
            style={styles.previewImage}
          />
        </View>
      )}

      {isEncoding && (
        <View style={StyleSheet.absoluteFill}>
          <ActivityIndicator size="large" color="#ffffff" style={styles.loadingIndicator} />
          <Text style={styles.loadingText}>Encoding info...</Text>
        </View>
      )}

      {webViewHtml && (
        <View style={styles.hiddenWebViewContainer}>
          <WebView
            originWhitelist={['*']}
            source={{ html: webViewHtml, baseUrl: '' }}
            onMessage={handleWebViewMessage}
            style={styles.webViewContent}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onError={(syntheticEvent) => {
              const {nativeEvent} = syntheticEvent;
              console.warn('WebView error: ', nativeEvent);
              setIsEncoding(false);
              setWebViewHtml(null);
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    margin: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  button: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'black',
  },
  text: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    padding: 20,
  },
  preview: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 80,
    height: 120,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 10,
    borderRadius: 8,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  hiddenWebViewContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
    top: -3000,
    left: -3000,
    overflow: 'hidden',
  },
  webViewContent: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingText: {
    position: 'absolute',
    alignSelf: 'center',
    top: '60%',
    color: 'white',
    fontSize: 18,
  },
}); 