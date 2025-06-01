import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';

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

})(\"steg\", this, function () {
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
  "loadImg\": function(url) {
    var image = new Image();
    image.src = url;
    return image;
  }
};

Cover.prototype.config = {
  "t": 3,
  "threshold": 1,
  "codeUnitSize": 16,
  "args\": function(i) { return i+1; },
  "messageDelimiter\": function(modMessage,threshold) {
            var delimiter = new Array(threshold*3);
            for(var i = 0; i < delimiter.length; i+=1)
              delimiter[i] = 255;
            
            return delimiter;
          },
  "messageCompleted\": function(data, i, threshold) {
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
  if(typeof image === \'string\' && image.length) {
    image = util.loadImg(image);
  } else if(image.src) {
    image = util.loadImg(image.src);
  } else if(!(image instanceof HTMLImageElement)) {
    throw new Error(\'IllegalInput: The input image is neither an URL string nor an image instance.\');
  }

  options = options || {};
  var config = this.config;

  var t = options.t || config.t,
    threshold = options.threshold || config.threshold,
    codeUnitSize = options.codeUnitSize || config.codeUnitSize,
    prime = util.findNextPrime(Math.pow(2,t)),
    args = options.args || config.args,
    messageDelimiter = options.messageDelimiter || config.messageDelimiter;

  if(!t || t < 1 || t > 7) throw new Error(\'IllegalOptions: Parameter t = \' + t + \' is not valid: 0 < t < 8\');

  var shadowCanvas = document.createElement(\'canvas\'),
    shadowCtx = shadowCanvas.getContext(\'2d\');

  shadowCanvas.style.display = \'none\';
  shadowCanvas.width = options.width || image.naturalWidth || image.width;
  shadowCanvas.height = options.height || image.naturalHeight || image.height;
  
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
  if(typeof image === \'string\' && image.length) {
    image = util.loadImg(image);
  } else if(image.src) {
    image = util.loadImg(image.src);
  } else if(!(image instanceof HTMLImageElement)) {
    throw new Error(\'IllegalInput: The input image is neither an URL string nor an image instance.\');
  }

  options = options || {};
  var config = this.config;

  var t = options.t || config.t,
    threshold = options.threshold || config.threshold,
    codeUnitSize = options.codeUnitSize || config.codeUnitSize,
    prime = util.findNextPrime(Math.pow(2, t)),
    args = options.args || config.args,
    messageCompleted = options.messageCompleted || config.messageCompleted;

  if(!t || t < 1 || t > 7) throw new Error(\'IllegalOptions: Parameter t = \' + t + \' is not valid: 0 < t < 8\');

  var shadowCanvas = document.createElement(\'canvas\'),
    shadowCtx = shadowCanvas.getContext(\'2d\');

  shadowCanvas.style.display = \'none\';
  shadowCanvas.width = options.width || image.naturalWidth || image.width;
  shadowCanvas.height = options.height || image.naturalHeight || image.height;
  
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

export default function Verify() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [decodedInfo, setDecodedInfo] = useState<string | null>(null);
  const [webViewHtml, setWebViewHtml] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const pickImage = async () => {
    setSelectedImage(null);
    setDecodedInfo(null);
    setErrorText(null);
    setIsDecoding(true);

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 1,
      base64: true, // Request base64 directly
    });

    if (result.canceled) {
      setIsDecoding(false);
      return;
    }

    if (result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.uri) {
        setSelectedImage(asset.uri); // For display
        
        // Use base64 from picker if available, otherwise read from URI
        let base64ImageData = asset.base64;
        if (!base64ImageData) {
          try {
            base64ImageData = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          } catch (e) {
            console.error("Failed to read image as base64", e);
            setErrorText("Failed to load image data. Please try another image.");
            setIsDecoding(false);
            return;
          }
        }
        
        if (base64ImageData) {
            // Determine image type (jpeg or png). Default to jpeg if unknown.
            let imageMimeType = 'image/jpeg';
            if (asset.uri.endsWith('.png')) {
                imageMimeType = 'image/png';
            }

            const htmlContent = `
              <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script>${steganographyLib}</script>
              </head>
              <body>
                <img id="sourceImage" />
                <p id="status">Loading image for decoding...</p>
                <script>
                  const image = document.getElementById('sourceImage');
                  const statusP = document.getElementById('status');
                  const base64Photo = "data:${imageMimeType};base64,${base64ImageData}";
                  
                  image.onload = function() {
                    try {
                      statusP.innerText = "Decoding...";
                      const decodedMessage = steg.decode(image);
                      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'decodedInfo', data: decodedMessage }));
                    } catch (e) {
                      statusP.innerText = "Error during decoding: " + e.toString();
                      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', data: 'Error decoding image: ' + e.toString() + ' Stack: ' + e.stack}));
                    }
                  };
                  image.onerror = function() {
                     statusP.innerText = "Image failed to load in WebView.";
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', data: 'Image failed to load in WebView for decoding.' }));
                  };
                  image.src = base64Photo;
                </script>
              </body>
              </html>
            `;
            setWebViewHtml(htmlContent);
        } else {
            setErrorText("Could not get base64 data for the image.");
            setIsDecoding(false);
        }

      } else {
        setErrorText("Selected image has no URI.");
        setIsDecoding(false);
      }
    } else {
      setErrorText("No image selected or an error occurred.");
      setIsDecoding(false);
    }
  };

  const handleWebViewMessage = (event: any) => {
    setWebViewHtml(null); // Hide WebView after processing
    setIsDecoding(false);
    const messageData = JSON.parse(event.nativeEvent.data);

    if (messageData.type === 'decodedInfo') {
      if (messageData.data && messageData.data.trim() !== '') {
        try {
            const parsedData = JSON.parse(messageData.data);
             // Format the JSON data for display
            let formattedString = '';
            for (const key in parsedData) {
                if (parsedData.hasOwnProperty(key)) {
                    if (key === 'location' && parsedData[key]) {
                        formattedString += `Location:\nLat: ${parsedData[key].latitude}\nLon: ${parsedData[key].longitude}\n`;
                    } else {
                        formattedString += `${key.charAt(0).toUpperCase() + key.slice(1)}: ${parsedData[key]}\n`;
                    }
                }
            }
            setDecodedInfo(formattedString.trim());
        } catch (e) {
            // If JSON.parse fails, it might be a simple string or malformed JSON
            setDecodedInfo("Decoded (raw): " + messageData.data);
        }
        setErrorText(null);
      } else {
        setErrorText("No hidden information found in the image, or it was empty.");
        setDecodedInfo(null);
      }
    } else if (messageData.type === 'error') {
      console.error('WebView decoding error:', messageData.data);
      setErrorText(`Decoding failed: ${messageData.data.substring(0, 200)}...`);
      setDecodedInfo(null);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={pickImage} disabled={isDecoding}>
        <Text style={styles.buttonText}>Select Image to Verify</Text>
      </TouchableOpacity>

      {isDecoding && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Decoding...</Text>
        </View>
      )}

      {selectedImage && !isDecoding && (
        <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
      )}

      {decodedInfo && !isDecoding && (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Decoded Information:</Text>
          <Text style={styles.infoText}>{decodedInfo}</Text>
        </View>
      )}
      
      {errorText && !isDecoding && (
        <View style={[styles.infoBox, styles.errorBox]}>
            <Text style={styles.infoTitle}>Error:</Text>
            <Text style={styles.errorText}>{errorText}</Text>
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
              console.warn('WebView error (verify screen): ', nativeEvent);
              setErrorText(`WebView initialization failed: ${nativeEvent.description}`);
              setIsDecoding(false);
              setWebViewHtml(null);
            }}
          />
        </View>
      )}

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
        disabled={isDecoding}
      >
        <Text style={styles.backButtonText}>← Back to Main Menu</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontSize: 24,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#6200EE',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    minWidth: 250,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  imagePreview: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  infoBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#373c40',
    borderRadius: 8,
    width: '90%',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 16,
    color: '#e0e0e0',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  errorBox: {
    backgroundColor: '#5c2323',
    borderColor: '#ff4c4c',
    borderWidth: 1,
  },
  errorText: {
      fontSize: 16,
      color: '#ffcccc',
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
  loadingContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
  }
}); 